import type { Metadata } from "next";
import { loadModel } from "@/lib/model";
import { ReceiptsView } from "./receipts-view";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "The Receipts · Black Bull Ledger",
  description: "The $ANSEM saga as it happened on X: the key tweets and Ansem's full archived feed through the airdrop campaign.",
};

export default function ReceiptsPage() {
  const model = loadModel();
  return <ReceiptsView model={model} />;
}
