import type { Metadata } from "next";
import { ScanView } from "./scan-view";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "The Scanner · blackwiki.fun",
  description:
    "The tool Ansem asked for, for any coin: the most viral X posts on a ticker from the last 7 days, ranked by views. Pay per scan, straight onchain.",
};

export default function ScanPage() {
  return <ScanView />;
}
