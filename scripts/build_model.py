#!/usr/bin/env python3
"""Merge collected $ANSEM airdrop data into the site model (data/model.json).

Usage: python3 scripts/build_model.py --src <collection_dir>

<collection_dir> must contain:
  onchain/transfers.json    - every outgoing transfer from the airdrop wallet
  onchain/recipients.json   - aggregated per-recipient
  onchain/identities.json   - pump.fun / .sol identity per recipient (partial ok)
  onchain/holders.json      - {owner: ui_balance} snapshot of all holders
  market/ohlcv_hour.json    - GeckoTerminal hourly candles for the main pool
  research/dossier.json     - synthesized event dossier
  xdata/hydrated/*.json     - syndication-hydrated key tweets
"""
import argparse, html, json, os, shutil, statistics, time

MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump"
AIRDROP_WALLET = "GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52"

KNOWN_WALLETS = {
    "yHCxHBEaJW5tbndqC8JciSThr7U1cqLpdcsvHcx6PRe": "Token deployer (anon; gifted 65% to Ansem, netted ~$5.5K)",
    "GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52": "Ansem's airdrop wallet",
    "CxCTVjvgK3bWcgavMKo8PushR8ycw1atrWiSTruZrdtT": "The 261x trader ($2.3K -> $614K, per Lookonchain)",
    "FnzKY6x7entQ1eR3D225dQyT7ybfka4PskBMQhb8L3CC": "PumpSwap ANSEM/SOL pool",
    "6e7V9eegCHw997T72MxgwwJipZ6GJyZF8NvjkzT1rvpN": "Meteora ANSEM/SOL pool",
}


def load(path, default=None):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        if default is not None:
            return default
        raise


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    args = ap.parse_args()
    src = args.src
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    transfers = load(os.path.join(src, "onchain", "transfers.json"))
    recipients = load(os.path.join(src, "onchain", "recipients.json"))
    identities = {i["wallet"]: i for i in load(os.path.join(src, "onchain", "identities.json"), [])}
    holders = load(os.path.join(src, "onchain", "holders.json"), {})
    dossier = load(os.path.join(src, "research", "dossier.json"))

    # --- price lookup: hour bucket -> close ---
    ohlcv = load(os.path.join(src, "market", "ohlcv_hour.json"))
    candles = ((ohlcv.get("data", {}).get("attributes", {}) or {}).get("ohlcv_list")) or []
    price_by_hour = {int(c[0]) // 3600: float(c[4]) for c in candles}

    def price_at(ts):
        if ts is None:
            return None
        h = int(ts) // 3600
        for probe in (h, h - 1, h + 1, h - 2):
            if probe in price_by_hour:
                return price_by_hour[probe]
        return None

    # --- enrich transfers with USD ---
    for t in transfers:
        p = price_at(t["block_time"])
        t["usd"] = round(t["amount"] * p, 2) if p else None

    # --- recipients ---
    out_recipients = []
    for r in recipients:
        w = r["wallet"]
        txs = []
        usd_total = 0.0
        usd_known = False
        for tx in r["txs"]:
            p = price_at(tx["ts"])
            usd = round(tx["amount"] * p, 2) if p else None
            if usd is not None:
                usd_total += usd
                usd_known = True
            txs.append({"sig": tx["sig"], "ts": tx["ts"], "amount": round(tx["amount"], 2), "usd": usd})
        bal = holders.get(w, 0.0)
        total = r["total"]
        held_pct = max(0.0, min(1.0, bal / total)) if total > 0 else 0.0
        if not holders:
            status = "unknown"
        elif bal >= total * 0.9:
            status = "holding"
        elif bal > total * 0.02:
            status = "partial"
        else:
            status = "sold"
        ident = identities.get(w) or {}
        pf = ident.get("pumpfun") or {}
        identity = None
        if pf.get("username") or pf.get("twitter"):
            handle = None
            tw = pf.get("twitter") or ""
            if tw:
                handle = tw.rstrip("/").split("/")[-1].split("?")[0]
                if handle.isdigit() or "status" in tw:
                    handle = None
            identity = {"type": "pumpfun", "name": pf.get("username"), "twitter": handle,
                        "url": f"https://pump.fun/profile/{w}"}
        elif ident.get("sol_domains"):
            dom = ident["sol_domains"][0]
            identity = {"type": "sns", "name": dom if dom.endswith(".sol") else dom + ".sol", "twitter": None,
                        "url": f"https://www.sns.id/domain?domain={dom.removesuffix('.sol')}"}
        out_recipients.append({
            "wallet": w,
            "total": round(total, 2),
            "usd_at_drop": round(usd_total, 2) if usd_known else None,
            "tx_count": len(txs),
            "txs": txs,
            "first_ts": r["first_ts"],
            "last_ts": r["last_ts"],
            "balance_now": round(bal, 2),
            "held_pct": round(held_pct, 4),
            "status": status,
            "identity": identity,
            "known_label": KNOWN_WALLETS.get(w),
        })
    out_recipients.sort(key=lambda x: -(x["usd_at_drop"] or 0))
    for i, r in enumerate(out_recipients):
        r["rank"] = i + 1

    # --- aggregate stats ---
    usd_values = [t["usd"] for t in transfers if t["usd"] is not None]
    total_usd = round(sum(usd_values), 2)
    total_ansem = round(sum(t["amount"] for t in transfers), 2)
    statuses = [r["status"] for r in out_recipients]
    top7 = sorted((r["total"] for r in out_recipients), reverse=True)[:7]
    daily = {}
    for t in transfers:
        d = time.strftime("%Y-%m-%d", time.gmtime(t["block_time"]))
        e = daily.setdefault(d, {"date": d, "count": 0, "amount": 0.0, "usd": 0.0})
        e["count"] += 1
        e["amount"] += t["amount"]
        e["usd"] += t["usd"] or 0.0
    airdrop_daily = [
        {**e, "amount": round(e["amount"], 2), "usd": round(e["usd"], 2)}
        for e in sorted(daily.values(), key=lambda x: x["date"])
    ]

    named = [r for r in out_recipients if r["identity"]]
    stats = {
        "total_transfers": len(transfers),
        "unique_recipients": len(out_recipients),
        "total_ansem": total_ansem,
        "total_usd_at_drop": total_usd,
        "median_drop_usd": round(statistics.median(usd_values), 2) if usd_values else None,
        "largest_drop_usd": round(max(usd_values), 2) if usd_values else None,
        "smallest_drop_usd": round(min(usd_values), 2) if usd_values else None,
        "first_drop_ts": transfers[0]["block_time"] if transfers else None,
        "last_drop_ts": transfers[-1]["block_time"] if transfers else None,
        "holders_count": len(holders),
        "pct_recipients_holding": round(statuses.count("holding") / len(statuses), 4) if statuses else None,
        "pct_recipients_partial": round(statuses.count("partial") / len(statuses), 4) if statuses else None,
        "pct_recipients_sold": round(statuses.count("sold") / len(statuses), 4) if statuses else None,
        "top7_share_of_tokens": round(sum(top7) / total_ansem, 4) if total_ansem else None,
        "recipients_with_identity": len(named),
    }

    # --- tweets ---
    tweets = []
    hyd_dir = os.path.join(src, "xdata", "hydrated")
    if os.path.isdir(hyd_dir):
        for fn in os.listdir(hyd_dir):
            d = load(os.path.join(hyd_dir, fn))
            if d.get("_error") or not d.get("user"):
                continue
            photos = d.get("photos") or []
            quoted = d.get("quoted_tweet") or {}
            tweets.append({
                "id": d.get("id_str"),
                "url": f"https://x.com/{d['user']['screen_name']}/status/{d.get('id_str')}",
                "author": {
                    "name": d["user"].get("name"),
                    "handle": d["user"].get("screen_name"),
                    "avatar": d["user"].get("profile_image_url_https"),
                },
                "date": d.get("created_at"),
                "text": html.unescape(d.get("text", "")),
                "likes": d.get("favorite_count"),
                "replies": d.get("conversation_count"),
                "photo": photos[0]["url"] if photos else None,
                "quoted": {
                    "handle": (quoted.get("user") or {}).get("screen_name"),
                    "text": html.unescape(quoted.get("text", ""))[:280],
                } if quoted else None,
            })
    tweets.sort(key=lambda t: t.get("date") or "")

    model = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "token": dossier.get("token", {}),
        "copycats": dossier.get("copycat_mints", []),
        "market_snapshot": dossier.get("market", {}),
        "ansem": dossier.get("ansem", {}),
        "airdrop_wallet": AIRDROP_WALLET,
        "mint": MINT,
        "stats": stats,
        "airdrop_daily": airdrop_daily,
        "price_series": [[int(c[0]), float(c[4])] for c in sorted(candles, key=lambda c: c[0])],
        "recipients": out_recipients,
        "timeline": dossier.get("timeline", []),
        "tweets": tweets,
        "quotes": dossier.get("quotes", []),
        "open_questions": dossier.get("open_questions", []),
        "sources": dossier.get("sources", []),
    }

    out_path = os.path.join(root, "data", "model.json")
    with open(out_path, "w") as f:
        json.dump(model, f)
    print(f"model.json written: {os.path.getsize(out_path)/1024:.0f} KB")
    print(f"  recipients={len(out_recipients)} transfers={len(transfers)} tweets={len(tweets)}")
    print(f"  total airdropped: {total_ansem:,.0f} ANSEM (~${total_usd:,.0f} at drop time)")
    print(f"  identity resolved: {len(named)} | holding {stats['pct_recipients_holding']:.0%} / sold {stats['pct_recipients_sold']:.0%}")

    # copy raw sources into repo for provenance (holders is summarized above, too big raw)
    for rel in ("onchain/transfers.json", "onchain/recipients.json", "onchain/identities.json",
                "research/dossier.json", "market/ohlcv_hour.json"):
        s = os.path.join(src, rel)
        if os.path.exists(s):
            shutil.copy(s, os.path.join(root, "data", "raw", os.path.basename(rel)))
    print("raw sources copied to data/raw/")


if __name__ == "__main__":
    main()
