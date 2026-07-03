"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const RiveBull = dynamic(() => import("./rive-bull"), {
  ssr: false,
  loading: () => null,
});

/** The Black Bull loading mark: Rive animation inside a transparent circle
    with a thin border. */
export function Loader({ size = 96 }: { size?: number }) {
  return (
    <div className="loader-ring" style={{ width: size, height: size }} role="status" aria-label="loading">
      <RiveBull />
    </div>
  );
}

/** First-paint splash: black screen + bull loader. Shows once per session,
    skipped entirely for prefers-reduced-motion. */
export function Splash() {
  const [gone, setGone] = useState(false);
  const [removed, setRemoved] = useState(true);
  useEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      sessionStorage.getItem("bbl.splashed")
    ) {
      return;
    }
    sessionStorage.setItem("bbl.splashed", "1");
    setRemoved(false);
    const t1 = setTimeout(() => setGone(true), 950);
    const t2 = setTimeout(() => setRemoved(true), 1550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  if (removed) return null;
  return (
    <div className={`splash ${gone ? "splash-out" : ""}`} aria-hidden={gone}>
      <Loader size={110} />
    </div>
  );
}
