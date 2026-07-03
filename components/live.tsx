"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Live = {
  price: number;
  mcap: number | null;
  vol24: number | null;
  liq: number | null;
  chg24: number | null;
};

const LiveCtx = createContext<Live | null>(null);
export const useLive = () => useContext(LiveCtx);

const MINT = "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump";

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    let stop = false;
    async function pull() {
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`);
        const d = await r.json();
        const pairs = (d.pairs || []).filter((p: any) => p.chainId === "solana");
        if (!pairs.length) return;
        const top = pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
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
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, []);
  return <LiveCtx.Provider value={live}>{children}</LiveCtx.Provider>;
}
