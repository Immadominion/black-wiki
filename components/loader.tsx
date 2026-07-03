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

/** First-paint splash: black screen + bull loader, fades out once mounted. */
export function Splash() {
  const [gone, setGone] = useState(false);
  const [removed, setRemoved] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setGone(true), 1100);
    const t2 = setTimeout(() => setRemoved(true), 1750);
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
