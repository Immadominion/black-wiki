#!/usr/bin/env python3
"""Enrich airdrop recipients:
  holders   - snapshot ALL current ANSEM holders via Helius DAS getTokenAccounts -> holders.json
  identity  - pump.fun profile + .sol domain for each recipient -> identities.json
"""
import json, os, sys, time, urllib.request, urllib.error
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


def http_json(url, payload=None, headers=None, retries=3, timeout=45):
    h = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    if headers:
        h.update(headers)
    data = json.dumps(payload).encode() if payload is not None else None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            return json.loads(urllib.request.urlopen(req, timeout=timeout).read())
        except urllib.error.HTTPError as e:
            if e.code in (404, 400):
                return None
            if attempt == retries - 1:
                return {"_error": e.code}
            time.sleep(1.5 * (attempt + 1))
        except Exception:
            if attempt == retries - 1:
                return {"_error": "network"}
            time.sleep(1.5 * (attempt + 1))


def holders():
    out_path = os.path.join(OUT_DIR, "holders.json")
    holders_map = {}
    cursor = None
    page = 0
    while True:
        params = {"mint": MINT, "limit": 1000}
        if cursor:
            params["cursor"] = cursor
        r = http_json(RPC, {"jsonrpc": "2.0", "id": 1, "method": "getTokenAccounts", "params": params})
        result = (r or {}).get("result") or {}
        accs = result.get("token_accounts") or []
        for a in accs:
            o = a.get("owner")
            amt = int(a.get("amount", 0)) / 1e6
            if o:
                holders_map[o] = holders_map.get(o, 0) + amt
        page += 1
        if page % 10 == 0:
            print(f"[holders] page {page}, owners so far: {len(holders_map)}")
        cursor = result.get("cursor")
        if not cursor or not accs:
            break
    json.dump(holders_map, open(out_path, "w"))
    print(f"[holders] TOTAL owners: {len(holders_map)} (pages: {page})")


def fetch_identity(wallet):
    ident = {"wallet": wallet}
    # pump.fun profile
    for base in ("https://frontend-api-v3.pump.fun", "https://frontend-api.pump.fun"):
        p = http_json(f"{base}/users/{wallet}")
        if p and not p.get("_error") and (p.get("username") or p.get("twitter") or p.get("profile_image")):
            ident["pumpfun"] = {k: p.get(k) for k in ("username", "twitter", "profile_image", "bio", "followers") if p.get(k) is not None}
            break
    # .sol domains via Bonfida worker proxy
    d = http_json(f"https://sns-sdk-proxy.bonfida.workers.dev/domains/{wallet}")
    if d and isinstance(d.get("result"), list) and d["result"]:
        doms = [x.get("domain") or x for x in d["result"]]
        ident["sol_domains"] = [str(x) for x in doms][:5]
    return ident


def identity():
    recipients = json.load(open(os.path.join(OUT_DIR, "recipients.json")))
    wallets = [r["wallet"] for r in recipients]
    out_path = os.path.join(OUT_DIR, "identities.json")
    existing = {}
    if os.path.exists(out_path):
        existing = {i["wallet"]: i for i in json.load(open(out_path))}
    todo = [w for w in wallets if w not in existing]
    print(f"[identity] {len(todo)} wallets to resolve ({len(existing)} cached)")
    done = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {ex.submit(fetch_identity, w): w for w in todo}
        for f in as_completed(futs):
            ident = f.result()
            existing[ident["wallet"]] = ident
            done += 1
            if done % 50 == 0:
                print(f"[identity] {done}/{len(todo)}")
                json.dump(list(existing.values()), open(out_path, "w"))
    json.dump(list(existing.values()), open(out_path, "w"))
    named = [i for i in existing.values() if i.get("pumpfun") or i.get("sol_domains")]
    print(f"[identity] resolved {len(named)}/{len(existing)} with some identity")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "holders"
    if cmd == "holders":
        holders()
    elif cmd == "identity":
        identity()
