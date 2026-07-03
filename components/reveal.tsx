"use client";

import { useEffect } from "react";

/** Scroll-triggered act reveals. Adds .in to each section's content as it
    enters the viewport. No-JS and reduced-motion users see everything
    immediately (the hiding class is only applied once JS confirms). */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const targets = Array.from(document.querySelectorAll(".section > .wrap"));
    if (!targets.length) return;
    document.documentElement.classList.add("has-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.16 }
    );
    // anything already on screen reveals instantly, no pop
    for (const t of targets) {
      const r = t.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) t.classList.add("in");
      io.observe(t);
    }
    return () => io.disconnect();
  }, []);
  return null;
}
