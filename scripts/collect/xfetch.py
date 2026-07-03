#!/usr/bin/env python3
"""Generic budgeted X API v2 fetcher. Subcommands:

  search <name> <query> [start_time] [max_pages]   - recent search, paginated via next_token
  walkback <name> <until_id> [start_time] [max_pages] - user timeline walk via until_id

All raw pages cached under <name>_pages/. Resumable, never refetches.
"""
import json, os, sys, time, urllib.request, urllib.parse, urllib.error

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(BASE))
OUT_DIR = os.path.join(ROOT, "data", "collection", "xdata")
os.makedirs(OUT_DIR, exist_ok=True)
ENV = {}
with open(os.path.join(ROOT, ".env")) as f:
    for line in f:
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            ENV[k] = v
TOKEN = ENV["X_BEARER_TOKEN"]
USER_ID = "973261472"

TWEET_FIELDS = "id,text,created_at,author_id,public_metrics,entities,referenced_tweets,conversation_id,attachments,note_tweet,in_reply_to_user_id"
EXPANSIONS = "attachments.media_keys,referenced_tweets.id,author_id"
MEDIA_FIELDS = "url,preview_image_url,type"
USER_FIELDS = "id,name,username,profile_image_url,public_metrics,verified,description"

def get(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read()), None
    except urllib.error.HTTPError as e:
        return None, (e.code, e.read().decode(errors="replace")[:600], dict(e.headers))

def run(name, build_url, max_pages, state_key):
    out_dir = os.path.join(OUT_DIR, f"{name}_pages")
    os.makedirs(out_dir, exist_ok=True)
    state_path = os.path.join(out_dir, "_state.json")
    state = {"cursor": None, "pages": 0, "done": False}
    if os.path.exists(state_path):
        state = json.load(open(state_path))
    if state.get("done"):
        print(f"[{name}] already complete ({state['pages']} pages)")
        return
    while state["pages"] < max_pages:
        url = build_url(state["cursor"])
        data, err = get(url)
        if err:
            code, body, hdrs = err
            if code == 429:
                print(f"[{name}] 429 rate limited; reset={hdrs.get('x-rate-limit-reset')}. Stopping (resumable).")
            else:
                print(f"[{name}] HTTP {code}: {body}")
            break
        state["pages"] += 1
        with open(os.path.join(out_dir, f"page_{state['pages']:03d}.json"), "w") as f:
            json.dump(data, f)
        meta = data.get("meta", {})
        n = meta.get("result_count", 0)
        rows = data.get("data") or []
        oldest = rows[-1]["created_at"] if rows else "?"
        cursor = meta.get(state_key) if state_key != "until_id" else (str(int(meta["oldest_id"]) ) if meta.get("oldest_id") and n > 0 else None)
        print(f"[{name}] page {state['pages']}: {n} tweets, oldest={oldest}, cursor={'yes' if cursor else 'NO'}")
        state["cursor"] = cursor
        if not cursor or n == 0:
            state["done"] = True
        with open(state_path, "w") as f:
            json.dump(state, f)
        if state["done"]:
            print(f"[{name}] complete.")
            break
        time.sleep(2.5)
    total = 0
    for fn in sorted(os.listdir(out_dir)):
        if fn.startswith("page_"):
            total += len(json.load(open(os.path.join(out_dir, fn))).get("data") or [])
    print(f"[{name}] TOTAL tweets cached: {total}")

cmd = sys.argv[1]
name = sys.argv[2]

if cmd == "search":
    query = sys.argv[3]
    start_time = sys.argv[4] if len(sys.argv) > 4 else None
    max_pages = int(sys.argv[5]) if len(sys.argv) > 5 else 30
    def build(cursor):
        p = {"query": query, "max_results": "100", "tweet.fields": TWEET_FIELDS,
             "expansions": EXPANSIONS, "media.fields": MEDIA_FIELDS, "user.fields": USER_FIELDS,
             "sort_order": "recency"}
        if start_time: p["start_time"] = start_time
        if cursor: p["next_token"] = cursor
        return "https://api.x.com/2/tweets/search/recent?" + urllib.parse.urlencode(p)
    run(name, build, max_pages, "next_token")

elif cmd == "walkback":
    until_id_start = sys.argv[3]
    start_time = sys.argv[4] if len(sys.argv) > 4 else "2026-06-10T00:00:00Z"
    max_pages = int(sys.argv[5]) if len(sys.argv) > 5 else 15
    def build(cursor):
        p = {"max_results": "100", "start_time": start_time, "exclude": "retweets",
             "tweet.fields": TWEET_FIELDS, "expansions": EXPANSIONS, "media.fields": MEDIA_FIELDS}
        p["until_id"] = cursor or until_id_start
        return f"https://api.x.com/2/users/{USER_ID}/tweets?" + urllib.parse.urlencode(p)
    run(name, build, max_pages, "until_id")
