"use client";

import { useLive } from "./live";
import { fmtAmt, fmtInt, fmtUsd } from "@/lib/format";
import type { Model } from "@/lib/model";

export function StatBand({ model }: { model: Model }) {
  const live = useLive();
  const s = model.stats;
  const p = live?.price ?? model.price_series[model.price_series.length - 1]?.[1] ?? null;
  return (
    <div className="statband">
      <div className="wrap statband-in">
        <div className="stat">
          <div className="v gold">{fmtUsd(s.total_usd_at_drop)}</div>
          <div className="k">airdropped, value at drop</div>
        </div>
        <div className="stat">
          <div className="v">{p && s.total_ansem ? fmtUsd(s.total_ansem * p) : "--"}</div>
          <div className="k">same drops, worth today</div>
        </div>
        <div className="stat">
          <div className="v">{fmtInt(s.unique_recipients)}</div>
          <div className="k">wallets received</div>
        </div>
        <div className="stat">
          <div className="v">{fmtAmt(s.total_ansem)}</div>
          <div className="k">$ANSEM sent</div>
        </div>
        <div className="stat">
          <div className="v">{fmtInt(s.holders_count)}</div>
          <div className="k">holders · goal 1M</div>
        </div>
        <div className="stat">
          <div className="v">{live?.mcap ? fmtUsd(live.mcap) : "--"}</div>
          <div className="k">market cap, live</div>
        </div>
      </div>
    </div>
  );
}
