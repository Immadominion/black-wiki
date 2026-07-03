"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ArchiveTweet, Model, Tweet } from "@/lib/model";
import { fmtAmt, fmtDate, fmtInt, fmtTime } from "@/lib/format";
import { ViralRow, highlight } from "@/components/viral-row";

function TweetCard({ t }: { t: Tweet }) {
  const [imgOk, setImgOk] = useState(true);
  const text = t.text.replace(/https:\/\/t\.co\/\S+$/, "").trim();
  return (
    <a className="tweet" href={t.url} target="_blank" rel="noopener noreferrer">
      <div className="th">
        {t.author.avatar && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="av" src={t.author.handle === "blknoiz06" ? "/ansem.jpg" : t.author.avatar} alt="" onError={() => setImgOk(false)} />
        ) : (
          <div className="av-fallback">{(t.author.name || "?")[0]}</div>
        )}
        <div>
          <div className="nm">{t.author.name}</div>
          <div className="hd">@{t.author.handle}</div>
        </div>
        <div className="dt">{fmtDate(t.date)}</div>
      </div>
      <div className="tx">{highlight(text)}</div>
      {t.quoted && (
        <div className="qt">
          <b>@{t.quoted.handle}</b>: {t.quoted.text}
        </div>
      )}
      <div className="tf">
        {t.likes !== null && (
          <span>
            ♥ <b>{fmtAmt(t.likes)}</b>
          </span>
        )}
        {t.replies !== null && (
          <span>
            ↩ <b>{fmtAmt(t.replies)}</b>
          </span>
        )}
        <span style={{ marginLeft: "auto" }}>open on X ↗</span>
      </div>
    </a>
  );
}

export function ReceiptsView({ model }: { model: Model }) {
  const [mode, setMode] = useState<"key" | "feed" | "viral">("key");
  const [feedFilter, setFeedFilter] = useState<"ansem" | "all">("ansem");

  const feed = useMemo(() => {
    let rows = model.archive;
    if (feedFilter === "ansem") {
      const re = /ansem|black ?bull|airdrop|holder|9cRCn9|bull market|trenches|stimmy/i;
      rows = rows.filter((t) => re.test(t.text) || (t.quoted_text && re.test(t.quoted_text)));
    }
    return rows;
  }, [model.archive, feedFilter]);

  const days = useMemo(() => {
    const by = new Map<string, ArchiveTweet[]>();
    for (const t of feed) {
      const d = t.date.slice(0, 10);
      if (!by.has(d)) by.set(d, []);
      by.get(d)!.push(t);
    }
    return Array.from(by.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [feed]);

  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 className="rise">The receipts</h1>
          <p className="sub rise rise-1">
            How it happened on X: from the anonymous launch Ansem initially waved off, to the creator-fee pledge,
            the airdrops, the exposé, and the victory laps. <b>{fmtInt(model.archive.length)} tweets archived</b>{" "}
            from @blknoiz06&apos;s feed, plus the key moments from around the timeline.
          </p>
          <div className="page-tabs">
            <button className={`pill ${mode === "key" ? "on" : ""}`} onClick={() => setMode("key")}>
              Key moments
            </button>
            <button className={`pill ${mode === "feed" ? "on" : ""}`} onClick={() => setMode("feed")}>
              Ansem&apos;s feed
            </button>
            <button className={`pill ${mode === "viral" ? "on" : ""}`} onClick={() => setMode("viral")}>
              Going viral
            </button>
            {mode === "feed" && (
              <>
                <span className="tool-sep" />
                <button
                  className={`pill ${feedFilter === "ansem" ? "on" : ""}`}
                  onClick={() => setFeedFilter("ansem")}
                >
                  $ANSEM only
                </button>
                <button className={`pill ${feedFilter === "all" ? "on" : ""}`} onClick={() => setFeedFilter("all")}>
                  everything
                </button>
              </>
            )}
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 34, paddingBottom: 56 }}>
        {mode === "key" ? (
          <div className="feat-grid rise">
            {model.tweets.map((t) => (
              <TweetCard key={t.id} t={t} />
            ))}
          </div>
        ) : mode === "viral" ? (
          <div className="rise">
            <a
              className="toolask"
              href="https://x.com/blknoiz06/status/2071586866860585432"
              target="_blank"
              rel="noopener noreferrer"
            >
              <p>
                &ldquo;is there a tool that i can use to airdrop to ppl with the most viral social media posts
                on a specific coin tag?&rdquo;
              </p>
              <span>Ansem, Jun 29 · 5.1K likes · this list is that tool, for $ANSEM ↗</span>
            </a>
            <div className="scan-plug">
              This board covers $ANSEM. <Link href="/scan/">The Scanner runs it live for any coin →</Link>
            </div>
            <div className="viral-list">
              {model.viral.map((v, i) => (
                <ViralRow key={v.id} v={v} rank={i + 1} />
              ))}
            </div>
            <div className="table-foot">
              <span>
                ranked by views at archive time · posts Ansem interacted with during the campaign · author
                identity via X&apos;s public embed data
              </span>
            </div>
          </div>
        ) : (
          <div className="rise">
            {days.map(([day, rows]) => (
              <div className="feed-day" key={day}>
                <h3>
                  {fmtDate(day + "T00:00:00Z")} · {rows.length} tweet{rows.length > 1 ? "s" : ""}
                </h3>
                {rows.map((t) => (
                  <div className="feed-row" key={t.id}>
                    <span className="t mono">{fmtTime(t.date)}</span>
                    <div className="body">
                      {t.is_reply && t.reply_to ? <span className="reply-to">↩ {t.reply_to} · </span> : null}
                      {highlight(t.text.replace(/https:\/\/t\.co\/\S+$/g, "").trim())}
                      {t.quoted_text ? <span className="reply-to"> · QT: “{t.quoted_text.slice(0, 120)}”</span> : null}
                    </div>
                    <div className="meta">
                      <span>
                        ♥ <b>{fmtAmt(t.likes)}</b>
                      </span>
                      <a
                        href={`https://x.com/blknoiz06/status/${t.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        open ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div className="table-foot">
              <span>
                archive covers Jun 28 → Jul 2 via the X API (older key moments live under &ldquo;Key
                moments&rdquo;) · engagement as-of archive time
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
