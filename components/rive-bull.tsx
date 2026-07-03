"use client";

import { useState } from "react";
import { useRive } from "@rive-app/react-canvas";

export default function RiveBull() {
  const [failed, setFailed] = useState(false);
  const { RiveComponent } = useRive({
    src: "/black-bull-loading.riv",
    autoplay: true,
    onLoadError: () => setFailed(true),
  });
  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/bull.png" alt="" className="loader-fallback" />;
  }
  return <RiveComponent className="loader-canvas" />;
}
