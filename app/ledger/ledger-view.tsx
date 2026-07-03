"use client";

import { useMemo, useState } from "react";
import type { Model, Recipient } from "@/lib/model";
import { fmtAmt, fmtInt, fmtPct, fmtTs, fmtUsd, fmtUsdFull, short } from "@/lib/format";

function Row({ r }: { r: Recipient }) {
  const [open, setOpen] = useState(false);
  const named = r.known_label || r.identity?.name;
  return (
    <>
      <div className="row" onClick={() => setOpen(!open)} title="click for transfer history">
        <div className="rank mono">{r.rank}</div>
        <div className="who">
          <div className="name">
            {named ? <span className="tag">{named}</span> : <span className="mono">{short(r.wallet)}</span>}
          </div>
          <small>
            {r.known_label
              ? "tracked wallet"
              : r.identity?.type === "pumpfun"
                ? "pump.fun profile"
                : r.identity?.type === "sns"
                  ? ".sol domain"
                  : `first seen ${fmtTs(r.first_ts).split(" ")[0]} ${fmtTs(r.first_ts).split(" ")[1]}`}
          </small>
        </div>
        <div className="addr">
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
        <div className="num mono r" title={r.total.toLocaleString("en-US")}>
          {fmtAmt(r.total)}
        </div>
        <div className="usd mono r" title={fmtUsdFull(r.usd_at_drop)}>
          {fmtUsd(r.usd_at_drop)}
        </div>
        <div className="when mono r">{fmtTs(r.first_ts)}</div>
        <div className="txs mono r">{r.tx_count}</div>
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
              <span className="mono" style={{ color: "var(--faint)" }}>
                {fmtTs(tx.ts)} UTC
              </span>
              <span className="mono">{fmtAmt(tx.amount)} ANSEM</span>
              <span className="mono" style={{ color: "var(--gold-bright)" }}>
                {fmtUsd(tx.usd)}
              </span>
              <a href={`https://solscan.io/tx/${tx.sig}`} target="_blank" rel="noopener noreferrer">
                {tx.sig.slice(0, 16)}… ↗
              </a>
            </div>
          ))}
          <div className="held">
            balance now: <b className="mono">{fmtAmt(r.balance_now)}</b> ANSEM · kept{" "}
            <b className="mono">{fmtPct(r.held_pct, 1)}</b> of what was dropped
            {r.identity && (
              <>
                {" · "}
                <a href={r.identity.url} target="_blank" rel="noopener noreferrer">
                  {r.identity.type === "pumpfun" ? `pump.fun: ${r.identity.name}` : r.identity.name} ↗
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

type Filter = "all" | "holding" | "sold" | "named";
type Sort = "usd" | "amount" | "time";

export function LedgerView({ model }: { model: Model }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("usd");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const s = model.stats;

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
      { l: "over $100K", min: 1e5, max: Infinity, n: 0 },
    ];
    for (const r of model.recipients) {
      const v = r.usd_at_drop ?? 0;
      const b = buckets.find((x) => v >= x.min && v < x.max);
      if (b) b.n++;
    }
    return buckets;
  }, [model.recipients]);
  const maxBucket = Math.max(...dropSizes.map((b) => b.n));
  const maxDaily = Math.max(...model.airdrop_daily.map((d) => d.usd));

  const holding = s.pct_recipients_holding ?? 0;
  const partial = s.pct_recipients_partial ?? 0;
  const sold = s.pct_recipients_sold ?? 0;

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 className="rise">The airdrop ledger</h1>
          <p className="sub rise rise-1">
            <b>{fmtInt(s.unique_recipients)} wallets</b> have received <b>{fmtAmt(s.total_ansem)} $ANSEM</b> across{" "}
            <b>{fmtInt(s.total_transfers)} transfers</b> since Jun 28 — worth <b>{fmtUsd(s.total_usd_at_drop)}</b> at
            the moments they landed. Click any row for its transfer history and onchain receipts.
          </p>
          <div style={{ height: 28 }} />
        </div>
      </div>

      {/* analysis strip */}
      <div className="wrap mini-strip rise rise-1">
        <div className="mini">
          <h4>Drop sizes · $ at drop</h4>
          {dropSizes.map((b) => (
            <div className="hbar" key={b.l}>
              <span className="l">{b.l}</span>
              <span className="track">
                <i style={{ width: `${(b.n / maxBucket) * 100}%` }} />
              </span>
              <span className="v mono">{fmtInt(b.n)}</span>
            </div>
          ))}
        </div>
        <div className="mini">
          <h4>Airdrops by day · UTC</h4>
          {model.airdrop_daily.map((d) => (
            <div className="hbar" key={d.date}>
              <span className="l mono">{d.date.slice(5)}</span>
              <span className="track">
                <i className="blue" style={{ width: `${(d.usd / maxDaily) * 100}%` }} />
              </span>
              <span className="v mono">{fmtUsd(d.usd, 1)}</span>
            </div>
          ))}
        </div>
        <div className="mini">
          <h4>Did they keep it?</h4>
          <div className="split">
            <i style={{ width: `${holding * 100}%`, background: "var(--hold)" }} />
            <i style={{ width: `${partial * 100}%`, background: "var(--gold)" }} />
            <i style={{ width: `${sold * 100}%`, background: "var(--exit)" }} />
          </div>
          <div className="legend">
            <span className="mk">
              <i style={{ background: "var(--hold)" }} />
              holding ≥90% <b className="mono">{fmtPct(holding, 0)}</b>
            </span>
            <span className="mk">
              <i style={{ background: "var(--gold)" }} />
              kept some <b className="mono">{fmtPct(partial, 0)}</b>
            </span>
            <span className="mk">
              <i style={{ background: "var(--exit)" }} />
              sold out <b className="mono">{fmtPct(sold, 0)}</b>
            </span>
          </div>
        </div>
        <div className="mini">
          <h4>Concentration</h4>
          <div className="big">{fmtPct(s.top7_share_of_tokens, 1)}</div>
          <div className="note">
            of all airdropped tokens went to just 7 wallets. Lookonchain flagged the same pattern on Jun 30 — and
            those wallets were already dumping.
          </div>
        </div>
      </div>

      {/* toolbar */}
      <div className="toolbar">
        <div className="wrap toolbar-in">
          {(["all", "holding", "sold", "named"] as Filter[]).map((f) => (
            <button
              key={f}
              className={`pill ${filter === f ? "on" : ""}`}
              onClick={() => {
                setFilter(f);
                setLimit(100);
              }}
            >
              {f === "all" ? "All" : f === "holding" ? "Still holding" : f === "sold" ? "Sold" : "Named"}
            </button>
          ))}
          <span className="tool-sep" />
          {(["usd", "amount", "time"] as Sort[]).map((so) => (
            <button key={so} className={`pill ${sort === so ? "on" : ""}`} onClick={() => setSort(so)}>
              {so === "usd" ? "by $" : so === "amount" ? "by tokens" : "by time"}
            </button>
          ))}
          <span className="count-note mono">{fmtInt(filtered.length)} wallets</span>
          <input
            className="search"
            placeholder="search wallet or name…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(100);
            }}
          />
        </div>
      </div>

      {/* table */}
      <div className="wrap" style={{ paddingBottom: 56 }}>
        <div className="thead">
          <div>#</div>
          <div>Recipient</div>
          <div>Wallet</div>
          <div className="r">$ANSEM</div>
          <div className="r">Value at drop</div>
          <div className="r">First drop</div>
          <div className="r">Txs</div>
          <div className="r">Status</div>
        </div>
        <div>
          {visible.map((r) => (
            <Row key={r.wallet} r={r} />
          ))}
        </div>
        {filtered.length > limit && (
          <button className="more" onClick={() => setLimit(limit + 200)}>
            show more — {fmtInt(filtered.length - limit)} remaining
          </button>
        )}
        <div className="table-foot">
          <span>
            status compares each wallet&apos;s current balance to what it received — tokens moved elsewhere read as
            sold · holders snapshot {model.generated_at.slice(0, 10)}
          </span>
          <span className="mono">
            Σ {fmtAmt(s.total_ansem)} ANSEM · {fmtUsd(s.total_usd_at_drop)} at drop
          </span>
        </div>
      </div>
    </>
  );
}
