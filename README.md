# blackwiki.fun

Public dashboard tracking **Ansem's ($ANSEM / "The Black Bull") airdrop campaign** on
Solana — every transfer out of his airdrop wallet, who received it, what it was worth
at that moment, whether they kept it, and the tweets that made it happen.

Live data: 979 transfers → 976 wallets → 69.74M $ANSEM (~$2.53M at drop time),
traced signature-by-signature from mainnet.

## Run it

```bash
npm install
npm run dev        # local dev on :3000
npm run build      # static export to out/ (deploy anywhere)
```

Every page is statically generated; the browser's only third-party call is live
price/market cap from DexScreener's public API. **No RPC keys ship to the client.**

The one dynamic piece is the Scanner (`/scan`): a pay-per-use version of the
viral-post tool, for any ticker. Flow: `POST /api/scan/intent {tag}` returns a
Solana Pay URL with a unique reference key; the payment is verified onchain via
RPC; a stateless HMAC pass then unlocks `POST /api/scan/run`, which queries the
X API server-side and returns the top posts of the last 7 days ranked by views.
Unpaid requests get an HTTP 402 with machine-readable payment terms (x402 style).
Requires `HELIUS_RPC`, `X_BEARER_TOKEN`, and `SCAN_SECRET` set as server-side
env vars in the deployment (never exposed to the client).

## Data pipeline

All data is baked into `data/model.json` by `scripts/build_model.py`. To refresh:

1. Copy `.env.example` → `.env` and fill `HELIUS_RPC` (and `X_BEARER_TOKEN` if
   refreshing tweets). `.env` is gitignored — keep it that way.
2. Collect (each step caches; safe to re-run):
   ```bash
   python3 scripts/collect/trace_airdrops.py         # all transfers out of the airdrop wallet
   python3 scripts/collect/enrich.py holders          # snapshot every current holder
   python3 scripts/collect/enrich.py identity         # pump.fun profiles + .sol domains
   python3 scripts/collect/hydrate_tweets.py <ids…>   # archive tweets (free syndication CDN)
   # market/ohlcv_hour.json: GeckoTerminal hourly candles for the PumpSwap pool
   ```
3. Rebuild the model and site:
   ```bash
   npm run model && npm run build
   ```

`data/raw/` holds committed copies of the collected sources for provenance;
`data/collection/` is the gitignored working directory the collectors write into.

## Key facts (verified onchain)

| | |
|---|---|
| Mint (authentic) | `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump` (pump.fun, Token-2022, renounced) |
| Airdrop wallet | `GV6UUmNxz2RpKxmNAPadYKb7uQpszwqQAu3qLJxVdC52` (~58.4% of supply) |
| Deployer | `yHCxHBEaJW5tbndqC8JciSThr7U1cqLpdcsvHcx6PRe` (anon; gifted Ansem 65%, netted ~$5.5K) |
| Copycat / decoy | `BWVL…p7Y7` — fake $86M one-sided liquidity, avoid |
| Campaign window | Jun 28 2026 02:07 UTC → ongoing |

Design system: see `DESIGN.md` ("Night Bull" theme). Read it before any UI change.

Independent community project. Not affiliated with Ansem or pump.fun. Not financial advice.
