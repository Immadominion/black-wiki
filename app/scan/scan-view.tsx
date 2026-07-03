"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ViralTweet } from "@/lib/model";
import { ViralRow } from "@/components/viral-row";
import { short } from "@/lib/format";

type Intent = {
  tag: string;
  reference: string;
  recipient: string;
  amountSol: number;
  payUrl: string;
  intent: string;
  exp: number;
};

type Stage = "idle" | "pay" | "running" | "done";

const PASS_KEY = "bw_scan_pass";

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data: j };
}

export function ScanView() {
  const [stage, setStage] = useState<Stage>("idle");
  const [tag, setTag] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [pass, setPass] = useState<{ pass: string; tag: string; exp: number } | null>(null);
  const [posts, setPosts] = useState<ViralTweet[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState("");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // a pass survives refreshes so a paid user never loses access mid-flow
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PASS_KEY) || "null");
      if (saved?.pass && saved.exp > Date.now()) setPass(saved);
      else localStorage.removeItem(PASS_KEY);
    } catch {}
  }, []);

  const stopPoll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stopPoll, []);

  const runScan = useCallback(async (p: { pass: string; tag: string }) => {
    setStage("running");
    setErr(null);
    const r = await post("/api/scan/run/", { pass: p.pass });
    if (r.ok) {
      setPosts(r.data.posts || []);
      setFetchedAt(r.data.fetchedAt || null);
      setStage("done");
    } else {
      setErr(r.data.error || "scan failed");
      setStage(r.status === 402 ? "idle" : "done");
      if (r.status === 402) {
        setPass(null);
        localStorage.removeItem(PASS_KEY);
      }
    }
  }, []);

  const checkPayment = useCallback(
    async (it: Intent, pastedSig?: string) => {
      const r = await post("/api/scan/verify/", { intent: it.intent, signature: pastedSig || undefined });
      if (r.ok && r.data.pass) {
        stopPoll();
        const p = { pass: r.data.pass, tag: r.data.tag, exp: r.data.exp };
        setPass(p);
        try {
          localStorage.setItem(PASS_KEY, JSON.stringify(p));
        } catch {}
        runScan(p);
        return true;
      }
      if (!r.ok) setErr(r.data.error || "could not check payment");
      return false;
    },
    [runScan]
  );

  const begin = async () => {
    setErr(null);
    setBusy(true);
    const r = await post("/api/scan/intent/", { tag });
    setBusy(false);
    if (!r.ok) {
      setErr(r.data.error || "could not start scan");
      return;
    }
    const it = r.data as Intent;
    setIntent(it);
    setStage("pay");
    stopPoll();
    pollRef.current = setInterval(() => checkPayment(it), 6000);
  };

  const copyAddr = (addr: string) => {
    navigator.clipboard?.writeText(addr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  const reset = () => {
    stopPoll();
    setStage("idle");
    setIntent(null);
    setPosts(null);
    setErr(null);
    setSig("");
  };

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 className="rise">The Scanner</h1>
          <p className="sub rise rise-1">
            On June 29 Ansem asked for <b>a tool to find the most viral posts on a specific coin tag</b>. This is
            it, live, for any coin: the top X posts on a ticker from the last 7 days, ranked by views. One scan
            costs a small SOL fee paid straight onchain. No account, no login, any wallet.
          </p>
          <div style={{ height: 34 }} />
        </div>
      </div>

      <div className="wrap scan-stage">
        {stage === "idle" && (
          <div className="rise">
            <form
              className="scan-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy && tag.trim()) begin();
              }}
            >
              <input
                className="scan-input"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="$TICKER"
                maxLength={16}
                autoFocus
              />
              <button className="btn btn-gold" type="submit" disabled={busy || !tag.trim()}>
                {busy ? "starting…" : "Scan it"}
              </button>
            </form>
            <ul className="scan-steps">
              <li>type any ticker, $ANSEM to $WIF to whatever launched an hour ago</li>
              <li>pay 0.005 SOL from any Solana wallet, the page detects it onchain</li>
              <li>get the live leaderboard: top posts by views, with authors and links</li>
            </ul>
            {pass && pass.exp > Date.now() && (
              <p className="scan-note">
                You hold a paid pass for ${pass.tag} (valid {Math.max(1, Math.round((pass.exp - Date.now()) / 60000))}{" "}
                more min).{" "}
                <button className="linklike" onClick={() => runScan(pass)}>
                  run it again →
                </button>
              </p>
            )}
            {err && <div className="scan-err">{err}</div>}
          </div>
        )}

        {stage === "pay" && intent && (
          <div className="pay-panel rise">
            <h3>
              Scan ${intent.tag} · <span className="pay-amount">{intent.amountSol} SOL</span>
            </h3>
            <div className="pay-row">
              <a className="btn btn-gold" href={intent.payUrl}>
                open in wallet
              </a>
              <button className="support-chip mono" onClick={() => copyAddr(intent.recipient)}>
                {copied ? "address copied" : short(intent.recipient)}
              </button>
              <span className="scan-note" style={{ marginTop: 0 }}>
                send exactly {intent.amountSol} SOL to this address
              </span>
            </div>
            <div className="pay-wait">
              <i /> watching the chain for your payment, this page confirms it automatically
            </div>
            <div className="sig-fallback">
              <span className="scan-note" style={{ marginTop: 0 }}>
                Paid from a wallet that ignores pay links? Paste the transaction signature:
              </span>
              <div className="pay-row" style={{ marginTop: 8 }}>
                <input
                  className="scan-input mono"
                  style={{ textTransform: "none", maxWidth: 420 }}
                  value={sig}
                  onChange={(e) => setSig(e.target.value)}
                  placeholder="transaction signature"
                />
                <button className="btn btn-ghost" onClick={() => checkPayment(intent, sig)} disabled={!sig.trim()}>
                  verify
                </button>
              </div>
            </div>
            <p className="scan-note">
              Pay link valid 30 minutes · one payment buys a 2 hour pass for ${intent.tag} ·{" "}
              <button className="linklike" onClick={reset}>
                cancel
              </button>
            </p>
            {err && <div className="scan-err">{err}</div>}
          </div>
        )}

        {stage === "running" && (
          <div className="pay-wait rise" style={{ marginTop: 10 }}>
            <i /> payment confirmed, pulling the last 7 days from X…
          </div>
        )}

        {stage === "done" && (
          <div className="rise">
            {posts && posts.length > 0 ? (
              <>
                <div className="section-head" style={{ marginBottom: 10 }}>
                  <h2>${pass?.tag || tag} right now</h2>
                  <span className="tail">
                    <button className="linklike" onClick={() => pass && runScan(pass)}>
                      refresh
                    </button>{" "}
                    ·{" "}
                    <button className="linklike" onClick={reset}>
                      scan another coin
                    </button>
                  </span>
                </div>
                <div className="viral-list">
                  {posts.map((v, i) => (
                    <ViralRow key={v.id} v={v} rank={i + 1} />
                  ))}
                </div>
                <div className="table-foot">
                  <span>
                    live from the X API {fetchedAt ? `at ${fetchedAt.slice(11, 16)} UTC` : ""} · last 7 days ·
                    ranked by views · view counts can lag on very fresh posts
                  </span>
                </div>
              </>
            ) : posts ? (
              <p className="sub">
                Nothing found for that tag in the last 7 days. Your pass stays valid for 2 hours, so
                you can re-run it once posts land.{" "}
                <button className="linklike" onClick={reset}>
                  scan another coin
                </button>
              </p>
            ) : null}
            {err && <div className="scan-err">{err}</div>}
          </div>
        )}
      </div>
    </>
  );
}
