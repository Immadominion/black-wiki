#!/usr/bin/env python3
"""Trace all $ANSEM transfers out of Ansem's airdrop wallet.

Phase A: getSignaturesForAddress on the airdrop token account (paginated, cached)
Phase B: getTransaction for every signature (batched JSON-RPC, threaded, cached)
Phase C: parse token transfers -> transfers.json + recipients.json
"""
import json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(BASE))
OUT_DIR = os.path.join(ROOT, "data", "collection", "onchain")
os.makedirs(OUT_DIR, exist_ok=True)
RPC = None
with open(os.path.join(ROOT, ".env")) as f:
    for line in f:
        if line.startswith("HELIUS_RPC="):
            RPC = line.strip().split("=", 1)[1]

MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump"
AIRDROP_WALLET = "GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52"
TOKEN_ACCOUNT = "2U9XFtekYTstzMYXmuyDCNdFxRYB91dMtSKxtUB5rVct"
DECIMALS = 6

SIGS_PATH = os.path.join(OUT_DIR, "sigs.json")
TX_DIR = os.path.join(OUT_DIR, "txs")
os.makedirs(TX_DIR, exist_ok=True)


def rpc_call(payload, retries=8):
    body = json.dumps(payload).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(RPC, data=body, headers={"Content-Type": "application/json"})
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except urllib.error.HTTPError as e:
            if attempt == retries - 1:
                raise
            time.sleep(6.0 * (attempt + 1) if e.code == 429 else 1.5 * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(1.5 * (attempt + 1))


def phase_a():
    if os.path.exists(SIGS_PATH):
        sigs = json.load(open(SIGS_PATH))
        print(f"[A] cached: {len(sigs)} signatures")
        return sigs
    sigs, before = [], None
    while True:
        params = [TOKEN_ACCOUNT, {"limit": 1000}]
        if before:
            params[1]["before"] = before
        r = rpc_call({"jsonrpc": "2.0", "id": 1, "method": "getSignaturesForAddress", "params": params})
        batch = r.get("result") or []
        sigs.extend(batch)
        print(f"[A] +{len(batch)} sigs (total {len(sigs)})")
        if len(batch) < 1000:
            break
        before = batch[-1]["signature"]
    json.dump(sigs, open(SIGS_PATH, "w"))
    return sigs


def fetch_tx(sig):
    out = os.path.join(TX_DIR, sig[:44] + ".json")
    if os.path.exists(out):
        return "cached"
    r = rpc_call({"jsonrpc": "2.0", "id": 1, "method": "getTransaction",
                  "params": [sig, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}]})
    json.dump(r.get("result"), open(out, "w"))
    return "fetched"


def phase_b(sigs):
    ok_sigs = [s["signature"] for s in sigs if s.get("err") is None]
    print(f"[B] fetching {len(ok_sigs)} successful txs ({len(sigs)-len(ok_sigs)} failed skipped)")
    done = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(fetch_tx, s): s for s in ok_sigs}
        for f in as_completed(futs):
            f.result()
            done += 1
            if done % 250 == 0:
                print(f"[B] {done}/{len(ok_sigs)}")
    print(f"[B] done: {done}")
    return ok_sigs


def phase_c(ok_sigs):
    transfers = []
    for sig in ok_sigs:
        path = os.path.join(TX_DIR, sig[:44] + ".json")
        if not os.path.exists(path):
            continue
        tx = json.load(open(path))
        if not tx:
            continue
        bt = tx.get("blockTime")
        meta = tx.get("meta") or {}
        # Use pre/post token balances: find ANSEM deltas per owner
        pre = {b["accountIndex"]: b for b in meta.get("preTokenBalances", []) if b.get("mint") == MINT}
        post = {b["accountIndex"]: b for b in meta.get("postTokenBalances", []) if b.get("mint") == MINT}
        deltas = {}
        owners = {}
        for idx in set(pre) | set(post):
            pre_amt = int(pre.get(idx, {}).get("uiTokenAmount", {}).get("amount", 0) or 0)
            post_amt = int(post.get(idx, {}).get("uiTokenAmount", {}).get("amount", 0) or 0)
            owner = (post.get(idx) or pre.get(idx, {})).get("owner")
            if owner:
                deltas[owner] = deltas.get(owner, 0) + (post_amt - pre_amt)
                owners[idx] = owner
        src_delta = deltas.get(AIRDROP_WALLET, 0)
        if src_delta >= 0:
            continue  # not an outflow tx
        for owner, delta in deltas.items():
            if owner == AIRDROP_WALLET or delta <= 0:
                continue
            transfers.append({
                "sig": sig, "block_time": bt, "to": owner,
                "amount": delta / (10 ** DECIMALS),
            })
    transfers.sort(key=lambda t: t["block_time"] or 0)
    json.dump(transfers, open(os.path.join(OUT_DIR, "transfers.json"), "w"), indent=1)

    recipients = {}
    for t in transfers:
        r = recipients.setdefault(t["to"], {"wallet": t["to"], "total": 0.0, "txs": [], "first_ts": t["block_time"], "last_ts": t["block_time"]})
        r["total"] += t["amount"]
        r["txs"].append({"sig": t["sig"], "ts": t["block_time"], "amount": t["amount"]})
        r["first_ts"] = min(r["first_ts"], t["block_time"])
        r["last_ts"] = max(r["last_ts"], t["block_time"])
    rec_list = sorted(recipients.values(), key=lambda r: -r["total"])
    json.dump(rec_list, open(os.path.join(OUT_DIR, "recipients.json"), "w"), indent=1)
    total_out = sum(t["amount"] for t in transfers)
    print(f"[C] transfers: {len(transfers)} | unique recipients: {len(rec_list)} | total ANSEM out: {total_out:,.0f}")
    if transfers:
        print(f"[C] window: {time.strftime('%Y-%m-%d %H:%M', time.gmtime(transfers[0]['block_time']))} -> {time.strftime('%Y-%m-%d %H:%M', time.gmtime(transfers[-1]['block_time']))} UTC")


if __name__ == "__main__":
    sigs = phase_a()
    ok = phase_b(sigs)
    phase_c(ok)
