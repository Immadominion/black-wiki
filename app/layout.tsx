import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Bull Ledger — every $ANSEM airdrop, receipts attached",
  description:
    "The full record of Ansem's $ANSEM airdrop campaign: 979 onchain transfers to 976 wallets, the tweets that started it, who's still holding, and the story as it happened.",
  openGraph: {
    title: "Black Bull Ledger",
    description: "Every $ANSEM airdrop Ansem has sent, traced onchain. The story, the wallets, the receipts.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
