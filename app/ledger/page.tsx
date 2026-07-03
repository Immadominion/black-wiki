import type { Metadata } from "next";
import { loadModel } from "@/lib/model";
import { LedgerView } from "./ledger-view";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "The Ledger · blackwiki.fun",
  description: "Every wallet Ansem has airdropped $ANSEM to, traced onchain: amounts, value at drop, and who's still holding.",
};

export default function LedgerPage() {
  const model = loadModel();
  return <LedgerView model={model} />;
}
