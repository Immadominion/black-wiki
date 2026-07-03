import type { Metadata } from "next";
import { LiveProvider } from "@/components/live";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Splash } from "@/components/loader";
import { loadModel } from "@/lib/model";
import "./globals.css";

export const metadata: Metadata = {
  title: "Black Bull Ledger — every $ANSEM airdrop, receipts attached",
  description:
    "The full record of Ansem's $ANSEM airdrop campaign: every onchain transfer, who received it, whether they kept it, and the tweets that made it happen.",
  icons: {
    icon: [{ url: "/favicon.png", sizes: "64x64", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Black Bull Ledger",
    description: "Every $ANSEM airdrop Ansem has sent, traced onchain. The story, the wallets, the receipts.",
    images: ["/bull-hero.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const model = loadModel();
  return (
    <html lang="en">
      <body>
        <Splash />
        <LiveProvider>
          <Nav />
          <main>{children}</main>
          <Footer generatedAt={model.generated_at} />
        </LiveProvider>
      </body>
    </html>
  );
}
