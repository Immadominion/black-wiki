"use client";

import { useState } from "react";
import type { ViralTweet } from "@/lib/model";
import { fmtAmt, fmtDate } from "@/lib/format";

export function highlight(text: string) {
  // collapse raw pasted mint addresses into a short form
  const clean = text.replace(/(?:solana:)?([1-9A-HJ-NP-Za-km-z]{40,44})/g, (_, m) => `${m.slice(0, 4)}…${m.slice(-4)}`);
  const parts = clean.split(/(\$[A-Za-z][A-Za-z0-9]*|@\w+)/g);
  return parts.map((p, i) =>
    p.startsWith("$") || p.startsWith("@") ? (
      <span key={i} className="hl">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function ViralRow({ v, rank }: { v: ViralTweet; rank: number }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <a className="viral-row" href={v.url} target="_blank" rel="noopener noreferrer">
      <span className="vr-rank mono">{rank}</span>
      <span className="vr-who">
        {v.author?.avatar && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="vr-av" src={v.author.avatar} alt="" onError={() => setImgOk(false)} />
        ) : (
          <span className="vr-av vr-av-fb">{(v.author?.name || "?")[0]}</span>
        )}
        <span className="vr-names">
          <b>{v.author?.name || "unknown"}</b>
          <small>{v.author ? `@${v.author.handle}` : "open to identify"} · {fmtDate(v.date)}</small>
        </span>
      </span>
      <span className="vr-text">{highlight(v.text.replace(/https:\/\/t\.co\/\S+/g, "").trim())}</span>
      <span className="vr-metrics mono">
        <b>{fmtAmt(v.views)}</b>
        <small>views</small>
      </span>
      <span className="vr-likes mono">♥ {fmtAmt(v.likes)}</span>
    </a>
  );
}
