"use client";

import { useState } from "react";

const SKR_NAME = "heisjoel.skr";
// resolved onchain from heisjoel.skr (AllDomains) so copy gives a raw address
const SKR_ADDRESS = "3hqiCoEipSWk69Mx1iPWjxjCvNRPTYEbENSBpkWtLsAG";
const PAY_URL = `solana:${SKR_ADDRESS}?label=${encodeURIComponent("Black Bull Ledger")}&message=${encodeURIComponent("Support the ledger")}`;

export function Support() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(SKR_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <div className="support">
      <div className="wrap support-in">
        <span className="support-lede">
          Built solo, from Nigeria. If the ledger paid you back, pay a little forward
        </span>
        <button className="support-chip mono" onClick={copy} title={`copies ${SKR_ADDRESS}`}>
          {copied ? "address copied" : SKR_NAME}
        </button>
        <a className="support-pay" href={PAY_URL} title="opens your Solana wallet">
          send with wallet ↗
        </a>
      </div>
    </div>
  );
}
