#!/usr/bin/env python3
"""Hydrate tweets by ID via the X syndication CDN (free, no API credits)."""
import json, os, sys, time, urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(BASE))
OUT_DIR = os.path.join(ROOT, "data", "collection", "xdata")
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, "hydrated")
os.makedirs(OUT, exist_ok=True)

def syndication_token(tweet_id):
    n = (int(tweet_id) / 1e15) * 3.141592653589793
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    i = int(n)
    frac = n - i
    s = "0" if i == 0 else ""
    while i:
        s = digits[i % 36] + s
        i //= 36
    s += "."
    for _ in range(12):
        frac *= 36
        d = int(frac)
        s += digits[d]
        frac -= d
    return s.replace("0", "").replace(".", "")

def hydrate(tid):
    path = os.path.join(OUT, f"{tid}.json")
    if os.path.exists(path):
        return "cached"
    url = f"https://cdn.syndication.twimg.com/tweet-result?id={tid}&token={syndication_token(tid)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        d = json.loads(urllib.request.urlopen(req, timeout=20).read())
    except Exception as e:
        d = {"_error": str(e)[:200], "id": tid}
    with open(path, "w") as f:
        json.dump(d, f)
    return d.get("_error") or "ok"

ids = sys.argv[1:]
if not ids:
    ids = [line.strip() for line in sys.stdin if line.strip()]
for tid in ids:
    r = hydrate(tid)
    print(tid, r if r != "ok" else "ok")
    time.sleep(0.6)
