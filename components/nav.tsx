"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLive } from "./live";
import { fmtPrice, short } from "@/lib/format";

const MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/ledger/", label: "The Ledger" },
  { href: "/receipts/", label: "The Receipts" },
];

export function Nav() {
  const live = useLive();
  const path = usePathname();
  const [copied, setCopied] = useState(false);
  const p = fmtPrice(live?.price);

  const copyMint = () => {
    navigator.clipboard?.writeText(MINT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bull.png" alt="The Black Bull" className="brand-bull" />
          <span className="brand-name">
            Black Bull <em>Ledger</em>
          </span>
        </Link>
        <nav className="nav-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${path === l.href || (l.href !== "/" && path?.startsWith(l.href.replace(/\/$/, ""))) ? "on" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-right">
          <span className={`price-tag mono ${live ? "is-live" : ""}`} aria-label={p.aria}>
            {live && <i className="live-dot" />}
            {p.text}
            {live?.chg24 !== null && live?.chg24 !== undefined && (
              <b style={{ color: live.chg24 >= 0 ? "var(--hold)" : "var(--exit)" }}>
                {live.chg24 >= 0 ? "+" : ""}
                {live.chg24.toFixed(1)}%
              </b>
            )}
          </span>
          <button className="mint-tag mono" onClick={copyMint} title={`copy mint: ${MINT}`}>
            {copied ? "copied" : short(MINT)}
          </button>
        </div>
      </div>
      <nav className="mobile-tabs">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={path === l.href || (l.href !== "/" && path?.startsWith(l.href.replace(/\/$/, ""))) ? "on" : ""}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
