"use client";

import { useEffect, useMemo, useState } from "react";
import type { Model, Recipient, Tweet } from "@/lib/model";

/* ---------- number formatting (crypto display spec) ---------- */

const invalid = (n: unknown): n is null | undefined =>
  n === null || n === undefined || (typeof n === "number" && !isFinite(n));

function abbrev(n: number, digits = 2): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(digits) + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(digits >= 2 ? 1 : digits) + "K";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** fiat_value, compact: $ prefix, K/M/B abbreviation */
function fmtUsd(n: number | null | undefined, digits = 2): string {
  if (invalid(n)) return "--";
  if (n === 0) return "$0.00";
  if (Math.abs(n) < 0.01) return "<$0.01";
  if (Math.abs(n) < 1000)
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return "$" + abbrev(n, digits);
}

/** fiat_value, detailed: full value with commas */
function fmtUsdFull(n: number | null | undefined): string {
  if (invalid(n)) return "--";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** token_amount, compact */
function fmtAmt(n: number | null | undefined): string {
  if (invalid(n)) return "--";
  if (n === 0) return "0";
  if (Math.abs(n) >= 1000) return abbrev(n, 2);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** token_price: never abbreviate; zero-subscript for >=3 leading zeros */
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
function fmtPrice(n: number | null | undefined): { text: string; aria?: string } {
  if (invalid(n)) return { text: "--" };
  if (n === 0) return { text: "$0.00" };
  if (n >= 0.001)
    return { text: "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }) };
  const s = n.toFixed(12);
  const m = s.match(/^0\.(0+)([1-9]\d{0,3})/);
  if (!m) return { text: "$" + n.toFixed(6) };
  const zeros = m[1].length;
  const sig = m[2].slice(0, 2);
  const sub = String(zeros).split("").map((d) => SUBS[+d]).join("");
  return { text: `$0.0${sub}${sig}`, aria: `$${s.replace(/0+$/, "")}` };
}

/** percent: no abbreviation */
function fmtPct(n: number | null | undefined, digits = 1): string {
  if (invalid(n)) return "--";
  const v = n * 100;
  if (v !== 0 && Math.abs(v) < 0.1) return "<0.1%";
  return v.toFixed(digits) + "%";
}

function fmtInt(n: number | null | undefined): string {
  if (invalid(n)) return "--";
  return Math.round(n).toLocaleString("en-US");
}

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;

function fmtTs(ts: number | null | undefined): string {
  if (invalid(ts)) return "--";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(+d)) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/* ---------- live market data (public DexScreener API; no keys) ---------- */

type Live = { price: number; mcap: number | null; vol24: number | null; liq: number | null; chg24: number | null };

function useLiveMarket(mint: string): Live | null {
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const d = await r.json();
        const pairs = (d.pairs || []).filter((p: any) => p.chainId === "solana");
        if (!pairs.length) return;
        const top = pairs.sort(
          (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        )[0];
        const liq = pairs.reduce((s: number, p: any) => s + (p.liquidity?.usd || 0), 0);
        const vol = pairs.reduce((s: number, p: any) => s + (p.volume?.h24 || 0), 0);
        if (!stop)
          setLive({
            price: parseFloat(top.priceUsd),
            mcap: top.marketCap || null,
            vol24: vol || null,
            liq: liq || null,
            chg24: top.priceChange?.h24 ?? null,
          });
      } catch {
        /* keep last */
      }
    }
    pull();
    const iv = setInterval(pull, 60_000);
    return () => { stop = true; clearInterval(iv); };
  }, [mint]);
  return live;
}

/* ---------- sparkline ---------- */

function Sparkline({ series, dropStart, dropEnd }: { series: [number, number][]; dropStart: number | null; dropEnd: number | null }) {
  if (!series.length) return null;
  const W = 640, H = 110, P = 4;
  const t0 = series[0][0], t1 = series[series.length - 1][0];
  const max = Math.max(...series.map((s) => s[1]));
  const x = (t: number) => P + ((t - t0) / (t1 - t0)) * (W - 2 * P);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const path = series.map((s, i) => `${i ? "L" : "M"}${x(s[0]).toFixed(1)},${y(s[1]).toFixed(1)}`).join("");
  const area = `${path}L${x(t1).toFixed(1)},${H - P}L${x(t0).toFixed(1)},${H - P}Z`;
  const athIdx = series.reduce((bi, s, i) => (s[1] > series[bi][1] ? i : bi), 0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="110" preserveAspectRatio="none" role="img" aria-label="ANSEM price history">
      <defs>
        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(240,176,74,0.28)" />
          <stop offset="100%" stopColor="rgba(240,176,74,0)" />
        </linearGradient>
      </defs>
      {dropStart && dropEnd && (
        <rect x={x(dropStart)} y={0} width={Math.max(2, x(dropEnd) - x(dropStart))} height={H} fill="rgba(107,150,239,0.10)" />
      )}
      <path d={area} fill="url(#fill)" />
      <path d={path} fill="none" stroke="#F0B04A" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={x(series[athIdx][0])} cy={y(series[athIdx][1])} r="3" fill="#F0B04A" />
    </svg>
  );
}

/* ---------- tweet card ---------- */

function TweetCard({ t }: { t: Tweet }) {
  const [imgOk, setImgOk] = useState(true);
  const text = t.text.replace(/https:\/\/t\.co\/\S+$/, "").trim();
  const parts = text.split(/(\$ANSEM|@\w+)/g);
  return (
    <a className="tweet" href={t.url} target="_blank" rel="noopener noreferrer">
      <div className="th">
        {t.author.avatar && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="av" src={t.author.avatar} alt="" onError={() => setImgOk(false)} />
        ) : (
          <div className="av-fallback">{(t.author.name || "?")[0]}</div>
        )}
        <div>
          <div className="nm">{t.author.name}</div>
          <div className="hd">@{t.author.handle}</div>
        </div>
        <div className="dt">{fmtDate(t.date)}</div>
      </div>
      <div className="tx">
        {parts.map((p, i) =>
          p.startsWith("$") || p.startsWith("@") ? (
            <span key={i} className="hl">{p}</span>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </div>
      {t.quoted && (
        <div className="qt">
          <b>@{t.quoted.handle}</b>: {t.quoted.text}
        </div>
      )}
      <div className="tf">
        {t.likes !== null && <span>♥ <b>{fmtAmt(t.likes)}</b></span>}
        {t.replies !== null && <span>↩ <b>{fmtAmt(t.replies)}</b></span>}
        <span style={{ marginLeft: "auto" }}>open on X ↗</span>
      </div>
    </a>
  );
}

/* ---------- ledger row ---------- */

function Row({ r }: { r: Recipient }) {
  const [open, setOpen] = useState(false);
  const name = r.known_label
    ? r.known_label
    : r.identity?.name
      ? r.identity.name
      : short(r.wallet);
  return (
    <>
      <div className="row" onClick={() => setOpen(!open)} title="click for transfers">
        <div className="rank mono">{r.rank}</div>
        <div className="who">
          <div className="name">
            {r.identity || r.known_label ? <span className="tag">{name}</span> : <span className="mono">{name}</span>}
          </div>
          <small>
            {r.identity?.type === "pumpfun" && "pump.fun profile"}
            {r.identity?.type === "sns" && ".sol domain"}
            {!r.identity && !r.known_label && `${r.tx_count} transfer${r.tx_count > 1 ? "s" : ""}`}
            {r.known_label && " — tracked wallet"}
          </small>
        </div>
        <div className="addr mono">
          <a
            href={`https://solscan.io/account/${r.wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={r.wallet}
          >
            {short(r.wallet)} ↗
          </a>
        </div>
        <div className="num mono r" title={r.total.toLocaleString("en-US")}>{fmtAmt(r.total)}</div>
        <div className="usd mono r" title={fmtUsdFull(r.usd_at_drop)}>{fmtUsd(r.usd_at_drop)}</div>
        <div className="when mono r">{fmtTs(r.first_ts).split(" ")[0]} {fmtTs(r.first_ts).split(" ")[1]}</div>
        <span className={`status ${r.status}`}>
          {r.status === "holding" && "holding"}
          {r.status === "partial" && `kept ${fmtPct(r.held_pct, 0)}`}
          {r.status === "sold" && "sold"}
          {r.status === "unknown" && "?"}
        </span>
      </div>
      {open && (
        <div className="row-detail">
          {r.txs.map((tx) => (
            <div className="tx" key={tx.sig}>
              <span className="mono" style={{ color: "var(--faint)" }}>{fmtTs(tx.ts)} UTC</span>
              <span className="mono">{fmtAmt(tx.amount)} ANSEM</span>
              <span className="mono" style={{ color: "var(--gold-bright)" }}>{fmtUsd(tx.usd)}</span>
              <a href={`https://solscan.io/tx/${tx.sig}`} target="_blank" rel="noopener noreferrer">
                {tx.sig.slice(0, 14)}â¦ ↗
              </a>
            </div>
          ))}
          <div className="held">
            balance now: <b className="mono">{fmtAmt(r.balance_now)}</b> ANSEM
            {" · "}kept <b className="mono">{fmtPct(r.held_pct, 1)}</b> of what was dropped
            {r.identity && (
              <>
                {" · "}
                <a href={r.identity.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>
                  {r.identity.type === "pumpfun" ? "pump.fun profile" : "SNS domain"} ↗
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- main ---------- */

type Filter = "all" | "holding" | "sold" | "named";
type Sort = "usd" | "amount" | "time";

export default function Dashboard({ model }: { model: Model }) {
  const live = useLiveMarket(model.mint);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("usd");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);
  const [copied, setCopied] = useState(false);

  const s = model.stats;
  const price = live?.price ?? null;

  const filtered = useMemo(() => {
    let rs = model.recipients;
    if (filter === "holding") rs = rs.filter((r) => r.status === "holding" || r.status === "partial");
    if (filter === "sold") rs = rs.filter((r) => r.status === "sold");
    if (filter === "named") rs = rs.filter((r) => r.identity || r.known_label);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      rs = rs.filter(
        (r) =>
          r.wallet.toLowerCase().includes(needle) ||
          (r.identity?.name || "").toLowerCase().includes(needle) ||
          (r.known_label || "").toLowerCase().includes(needle)
      );
    }
    if (sort === "amount") rs = [...rs].sort((a, b) => b.total - a.total);
    if (sort === "time") rs = [...rs].sort((a, b) => a.first_ts - b.first_ts);
    return rs;
  }, [model.recipients, filter, q, sort]);

  const visible = filtered.slice(0, limit);
  const dropSizes = useMemo(() => {
    const buckets = [
      { l: "under $1K", min: 0, max: 1e3, n: 0 },
      { l: "$1K – $5K", min: 1e3, max: 5e3, n: 0 },
      { l: "$5K – $25K", min: 5e3, max: 25e3, n: 0 },
      { l: "$25K – $100K", min: 25e3, max: 1e5, n: 0 },
      { l: "$100K – $500K", min: 1e5, max: 5e5, n: 0 },
      { l: "over $500K", min: 5e5, max: Infinity, n: 0 },
    ];
    for (const r of model.recipients) {
      const v = r.usd_at_drop ?? 0;
      const b = buckets.find((b) => v >= b.min && v < b.max);
      if (b) b.n++;
    }
    return buckets;
  }, [model.recipients]);
  const maxBucket = Math.max(...dropSizes.map((b) => b.n));
  const maxDaily = Math.max(...model.airdrop_daily.map((d) => d.usd));

  const holdingPct = s.pct_recipients_holding ?? 0;
  const partialPct = s.pct_recipients_partial ?? 0;
  const soldPct = s.pct_recipients_sold ?? 0;

  const dropStart = s.first_drop_ts as number | null;
  const dropEnd = s.last_drop_ts as number | null;
  const priceInfo = fmtPrice(price ?? undefined);

  const copyMint = () => {
    navigator.clipboard?.writeText(model.mint).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  const storyEvents = model.timeline.filter((e) => !e.date.includes("2024"));

  return (
    <div className="shell">
      {/* topbar */}
      <div className="topbar rise">
        <div className="wordmark">
          <div className="glyph" aria-hidden>&#128002;</div>
          <div>
            <h1>Black Bull <span>Ledger</span></h1>
            <div className="sub">every $ANSEM airdrop, receipts attached</div>
          </div>
        </div>
        <div className="topbar-right">
          <span className={`chip ${live ? "live" : ""}`}>
            {live && <span className="dot" />}
            <span className="mono" aria-label={priceInfo.aria}>{priceInfo.text}</span>
            {live?.chg24 !== null && live?.chg24 !== undefined && (
              <span className="mono" style={{ color: live.chg24 >= 0 ? "var(--hold)" : "var(--exit)" }}>
                {live.chg24 >= 0 ? "+" : ""}{live.chg24.toFixed(1)}%
              </span>
            )}
          </span>
          <span className="chip gold">
            <button className="copy" onClick={copyMint} title="copy mint address">
              <span className="mono">{copied ? "copied!" : short(model.mint)}</span> ⧉
            </button>
          </span>
          <a className="chip" href={`https://solscan.io/token/${model.mint}`} target="_blank" rel="noopener noreferrer">
            solscan ↗
          </a>
          <a className="chip" href="https://x.com/blknoiz06" target="_blank" rel="noopener noreferrer">
            @blknoiz06 ↗
          </a>
        </div>
      </div>

      {/* hero */}
      <section className="hero rise rise-1">
        <div>
          <div className="kicker">Ansem vs. the bear market &middot; live record</div>
          <h2>
            One trader is trying to <em>airdrop the bull market</em> into existence.
          </h2>
          <p className="lede">
            Since June 27, <a href="https://x.com/blknoiz06" target="_blank" rel="noopener noreferrer">Ansem</a> has
            been manually sending his pump.fun creator fees &mdash; as $ANSEM, &ldquo;The Black Bull&rdquo; &mdash; to
            holders&apos; wallets, chasing 1,000,000 holders. This ledger traces every transfer out of his airdrop
            wallet, who received it, what it was worth at that moment, and whether they kept it.
          </p>
        </div>
        <div className="kpis">
          <div className="kpi gold">
            <div className="v">{fmtUsd(s.total_usd_at_drop)}</div>
            <div className="k">airdropped (value at drop)</div>
          </div>
          <div className="kpi">
            <div className="v">{fmtInt(s.unique_recipients)}</div>
            <div className="k">wallets received</div>
          </div>
          <div className="kpi">
            <div className="v">{fmtInt(s.total_transfers)}</div>
            <div className="k">onchain transfers</div>
          </div>
          <div className="kpi">
            <div className="v">{fmtAmt(s.total_ansem)}</div>
            <div className="k">$ANSEM sent</div>
          </div>
          <div className="kpi">
            <div className="v">{fmtInt(s.holders_count)}</div>
            <div className="k">holders now &middot; goal 1M</div>
          </div>
          <div className="kpi gold">
            <div className="v">
              {(() => {
                const p = price ?? model.price_series[model.price_series.length - 1]?.[1];
                return p && s.total_ansem ? fmtUsd(s.total_ansem * p) : "--";
              })()}
            </div>
            <div className="k">those drops, worth today</div>
          </div>
          <div className="spark-wrap">
            <Sparkline series={model.price_series} dropStart={dropStart} dropEnd={dropEnd} />
            <div className="spark-meta">
              <span className="mk"><i />price since launch (Jun 16)</span>
              <span className="mk drop"><i />airdrop window</span>
              <span>launch <b className="mono">$0.0002</b> &rarr; ATH <b className="mono">$0.1798</b> (Jul 2)</span>
            </div>
          </div>
        </div>
      </section>

      {/* main grid */}
      <div className="grid">
        {/* left rail */}
        <aside className="rail rise rise-2">
          <div className="card">
            <h3>Market now</h3>
            <div className="stat-row"><span className="k">Price</span><span className="v" aria-label={priceInfo.aria}>{priceInfo.text}</span></div>
            <div className="stat-row"><span className="k">24h</span>
              <span className={`v ${(live?.chg24 ?? 0) >= 0 ? "up" : "down"}`}>
                {live?.chg24 !== null && live?.chg24 !== undefined ? `${live.chg24 >= 0 ? "+" : ""}${live.chg24.toFixed(1)}%` : "--"}
              </span>
            </div>
            <div className="stat-row"><span className="k">Market cap</span><span className="v">{live?.mcap ? fmtUsd(live.mcap) : "--"}</span></div>
            <div className="stat-row"><span className="k">24h volume</span><span className="v">{live?.vol24 ? fmtUsd(live.vol24) : "--"}</span></div>
            <div className="stat-row"><span className="k">DEX liquidity</span><span className="v">{live?.liq ? fmtUsd(live.liq) : "--"}</span></div>
            <div className="stat-row"><span className="k">Holders</span><span className="v">{fmtInt(s.holders_count)}</span></div>
            <div className="chart-note">live via DexScreener &middot; holders snapshot {fmtDate(model.generated_at)}</div>
          </div>

          <div className="card">
            <h3>Supply &amp; concentration</h3>
            <div className="meter">
              <div className="lbl"><span>Ansem&apos;s wallet</span><b className="mono">58.4%</b></div>
              <div className="bar"><i style={{ width: "58.4%" }} /></div>
            </div>
            <div className="meter">
              <div className="lbl"><span>Top 7 recipients&apos; share of drops</span><b className="mono">{fmtPct(s.top7_share_of_tokens, 1)}</b></div>
              <div className="bar"><i className="red" style={{ width: `${(s.top7_share_of_tokens ?? 0) * 100}%` }} /></div>
            </div>
            <div className="meter">
              <div className="lbl"><span>Recipients still holding</span><b className="mono">{fmtPct(holdingPct + partialPct, 0)}</b></div>
              <div className="bar"><i className="green" style={{ width: `${(holdingPct + partialPct) * 100}%` }} /></div>
            </div>
            <div className="chart-note">
              Lookonchain (Jun 30): 74% of the first $9.4M batch went to 7 wallets that were already dumping.
            </div>
          </div>

          <div className="card">
            <h3>The wallets</h3>
            <div className="wallet-line">
              <span className="who">Airdrop wallet<small>sends every drop &middot; 58.4% of supply</small></span>
              <a className="addr" href={`https://solscan.io/account/${model.airdrop_wallet}`} target="_blank" rel="noopener noreferrer">{short(model.airdrop_wallet)}</a>
            </div>
            <div className="wallet-line">
              <span className="who">Token deployer<small>anon &middot; gifted Ansem 65%, made ~$5.5K</small></span>
              <a className="addr" href="https://solscan.io/account/yHCxHBEaJW5tbndqC8JciSThr7U1cqLpdcsvHcx6PRe" target="_blank" rel="noopener noreferrer">yHCx&hellip;6PRe</a>
            </div>
            <div className="wallet-line">
              <span className="who">Mint<small>pump.fun &middot; Token-2022 &middot; renounced</small></span>
              <a className="addr" href={`https://solscan.io/token/${model.mint}`} target="_blank" rel="noopener noreferrer">{short(model.mint)}</a>
            </div>
            <div className="wallet-line">
              <span className="who">Main pool<small>PumpSwap ANSEM/SOL</small></span>
              <a className="addr" href="https://solscan.io/account/FnzKY6x7entQ1eR3D225dQyT7ybfka4PskBMQhb8L3CC" target="_blank" rel="noopener noreferrer">FnzK&hellip;L3CC</a>
            </div>
          </div>

          <div className="card warn">
            <h3>⚠ copycat warning</h3>
            <p>
              A second &ldquo;ANSEM&rdquo; mint (<span className="mono">BWVL&hellip;p7Y7</span>) shows a fake
              <b> $86M</b> of one-sided liquidity on a decoy Raydium pool. It is not the real token. The only
              authentic mint ends in <span className="mono" style={{ color: "var(--gold-bright)" }}>pump</span>.
            </p>
          </div>
        </aside>

        {/* center: the ledger */}
        <main className="ledger card rise rise-3">
          <div className="ledger-head">
            <h3>The airdrop ledger <span className="n">{fmtInt(filtered.length)} wallets</span></h3>
            <div className="filters">
              {(["all", "holding", "sold", "named"] as Filter[]).map((f) => (
                <button key={f} className={`pill ${filter === f ? "on" : ""}`} onClick={() => { setFilter(f); setLimit(50); }}>
                  {f === "all" ? "All" : f === "holding" ? "Still holding" : f === "sold" ? "Sold" : "Named"}
                </button>
              ))}
            </div>
            <div className="filters">
              {(["usd", "amount", "time"] as Sort[]).map((so) => (
                <button key={so} className={`pill ${sort === so ? "on" : ""}`} onClick={() => setSort(so)}>
                  {so === "usd" ? "by $" : so === "amount" ? "by tokens" : "by time"}
                </button>
              ))}
            </div>
            <input
              className="search"
              placeholder="search wallet or name…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setLimit(50); }}
            />
          </div>

          <div className="thead">
            <div>#</div><div>Recipient</div><div>Wallet</div>
            <div className="r">$ANSEM</div><div className="r">Value at drop</div>
            <div className="r">First drop</div><div className="r">Status</div>
          </div>
          <div className="rows">
            {visible.map((r) => <Row key={r.wallet} r={r} />)}
          </div>
          {filtered.length > limit && (
            <button className="more" onClick={() => setLimit(limit + 100)}>
              show {Math.min(100, filtered.length - limit)} more of {fmtInt(filtered.length - limit)} remaining
            </button>
          )}
          <div className="ledger-foot">
            <span>
              status = recipient wallet&apos;s current $ANSEM balance vs. what it received (moves to other wallets look like sells)
            </span>
            <span className="mono">
              Σ {fmtAmt(s.total_ansem)} ANSEM &middot; {fmtUsd(s.total_usd_at_drop)} at drop
            </span>
          </div>
        </main>

        {/* right rail: the story */}
        <aside className="rail right rise rise-4">
          <div className="card">
            <h3>How it works</h3>
            <div className="stat-row"><span className="k">Funding</span><span className="v">pump.fun creator fees</span></div>
            <div className="stat-row"><span className="k">Method</span><span className="v">manual sends, by hand</span></div>
            <div className="stat-row"><span className="k">Who gets it</span><span className="v">existing $ANSEM holders</span></div>
            <div className="stat-row"><span className="k">Stated goal</span><span className="v">1,000,000 holders</span></div>
            <div className="stat-row"><span className="k">Median drop</span><span className="v">{fmtUsd(s.median_drop_usd)}</span></div>
            <div className="stat-row"><span className="k">Largest drop</span><span className="v">{fmtUsd(s.largest_drop_usd)}</span></div>
            <div className="chart-note">
              &ldquo;ive been doing it all manually&hellip; airdropping to existing $ANSEM holders&rdquo; &mdash; Ansem, Jul 1
            </div>
          </div>
          <div className="card story">
            <h3>The story so far</h3>
            {storyEvents.map((e, i) => (
              <div className={`ev ${/expos|dump|copycat|decoy|scrutin/i.test(e.event) ? "neg" : ""}`} key={i}>
                <div className="d">{e.date}</div>
                <p>{e.event}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {/* story inline for narrow screens */}
      <div className="story-inline card" style={{ marginTop: 14 }}>
        <h3>The story so far</h3>
        <div className="story">
          {storyEvents.map((e, i) => (
            <div className="ev" key={i}>
              <div className="d">{e.date}</div>
              <p>{e.event}</p>
            </div>
          ))}
        </div>
      </div>

      {/* tweets */}
      <section className="tweets-band rise">
        <div className="band-head">
          <h3>The receipts &mdash; how it happened on X</h3>
          <span>key tweets, oldest first &middot; archived {fmtDate(model.generated_at)}</span>
        </div>
        <div className="tweet-grid">
          {model.tweets.map((t) => <TweetCard key={t.id} t={t} />)}
        </div>
      </section>

      {/* analysis */}
      <section className="analysis rise">
        <div className="card">
          <h3>Drop sizes <span className="n">per recipient, $ at drop</span></h3>
          <div className="bars">
            {dropSizes.map((b) => (
              <div className="hbar" key={b.l}>
                <span className="l">{b.l}</span>
                <span className="track"><i style={{ width: `${(b.n / maxBucket) * 100}%` }} /></span>
                <span className="v mono">{fmtInt(b.n)}</span>
              </div>
            ))}
          </div>
          <div className="chart-note">most drops are small; a handful are enormous &mdash; that skew is the whole controversy</div>
        </div>
        <div className="card">
          <h3>Airdrops by day <span className="n">UTC</span></h3>
          <div className="bars">
            {model.airdrop_daily.map((d) => (
              <div className="hbar" key={d.date}>
                <span className="l mono">{d.date.slice(5)}</span>
                <span className="track"><i className="blue" style={{ width: `${(d.usd / maxDaily) * 100}%` }} /></span>
                <span className="v mono">{fmtUsd(d.usd, 1)}</span>
              </div>
            ))}
          </div>
          <div className="chart-note">value at send time &middot; {fmtInt(s.total_transfers)} transfers total</div>
        </div>
        <div className="card">
          <h3>Did they keep it?</h3>
          <div className="split">
            <i style={{ width: `${holdingPct * 100}%`, background: "var(--hold)" }} title={`holding ${fmtPct(holdingPct)}`} />
            <i style={{ width: `${partialPct * 100}%`, background: "var(--gold)" }} title={`partial ${fmtPct(partialPct)}`} />
            <i style={{ width: `${soldPct * 100}%`, background: "var(--exit)" }} title={`sold ${fmtPct(soldPct)}`} />
          </div>
          <div className="legend">
            <span className="mk"><i style={{ background: "var(--hold)" }} />holding &ge;90% &middot; <b className="mono">{fmtPct(holdingPct, 0)}</b></span>
            <span className="mk"><i style={{ background: "var(--gold)" }} />kept some &middot; <b className="mono">{fmtPct(partialPct, 0)}</b></span>
            <span className="mk"><i style={{ background: "var(--exit)" }} />sold &middot; <b className="mono">{fmtPct(soldPct, 0)}</b></span>
          </div>
          <div className="chart-note" style={{ marginTop: 10 }}>
            measured against each recipient wallet&apos;s current balance ({fmtDate(model.generated_at)} snapshot).
            {" "}{fmtInt(s.recipients_with_identity)} of {fmtInt(s.unique_recipients)} recipients have a public identity
            (pump.fun profile or .sol domain).
          </div>
        </div>
      </section>

      {/* methodology */}
      <section className="method card rise">
        <h3>Methodology &amp; sources</h3>
        <div className="cols">
          <div>
            <ul>
              <li>
                Every transfer is read directly from Solana mainnet: all {fmtInt(s.total_transfers)} outgoing $ANSEM
                transfers from the airdrop wallet&apos;s token account, signature by signature.
              </li>
              <li>USD values use the hourly candle close (GeckoTerminal, PumpSwap pool) at each transfer&apos;s block time &mdash; approximate by nature.</li>
              <li>Identities come from pump.fun public profiles and SNS (.sol) reverse lookups on recipient wallets. No identity is guessed.</li>
              <li>Tweets are archived from the X API and X&apos;s public embed CDN; engagement counts are as-of archive time.</li>
              <li>&ldquo;Holding / sold&rdquo; compares a wallet&apos;s current balance to what it received; tokens moved to another wallet count as sold.</li>
              <li>Recipient count here ({fmtInt(s.unique_recipients)}) exceeds the press&apos;s &ldquo;704 wallets&rdquo; because the drops continued after those stories ran.</li>
            </ul>
          </div>
          <div>
            <ul>
              <li><a href="https://thedefiant.io/news/defi/ansem-airdrops-usd7m-of-usdansem-memecoin-in-bid-to-reach-1m-holders" target="_blank" rel="noopener noreferrer">The Defiant &mdash; $7M airdrop</a></li>
              <li><a href="https://www.cryptotimes.io/2026/06/30/ansems-9-43m-ansem-airdrop-7-wallets-got-74-already-dumping/" target="_blank" rel="noopener noreferrer">The Crypto Times &mdash; 7 wallets got 74%</a></li>
              <li><a href="https://cryptobriefing.com/ansem-airdrops-7m-ansem-memecoin-solana/" target="_blank" rel="noopener noreferrer">Crypto Briefing &mdash; campaign coverage</a></li>
              <li><a href="https://beincrypto.com/ansem-token-creator-fee-airdrop-solana/" target="_blank" rel="noopener noreferrer">BeInCrypto &mdash; creator-fee announcement</a></li>
              <li><a href="https://x.com/birdeye_data" target="_blank" rel="noopener noreferrer">Birdeye &mdash; onchain investigation thread</a></li>
              <li><a href={`https://solscan.io/token/${model.mint}`} target="_blank" rel="noopener noreferrer">Solscan &mdash; verify everything yourself</a></li>
            </ul>
          </div>
        </div>
        <p className="disclaimer">
          Independent community project &mdash; not affiliated with Ansem, pump.fun, or any exchange. Nothing here is
          financial advice; $ANSEM is a memecoin and most memecoins go to zero. Data snapshot {model.generated_at} UTC;
          price and market cap update live in your browser.
        </p>
      </section>

      <div className="footer">
        Black Bull Ledger &middot; built from onchain data &middot; last data refresh {fmtDate(model.generated_at)}
      </div>
    </div>
  );
}
