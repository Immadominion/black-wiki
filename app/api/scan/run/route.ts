import { NextResponse } from "next/server";
import { open, configured, searchViral, ScanError, RECIPIENT, PRICE_SOL } from "@/lib/scan-server";

/* 402 in the x402 spirit: machine-readable payment terms on the endpoint itself,
   so agents can discover the flow without reading the site. */
function paymentRequired() {
  return NextResponse.json(
    {
      error: "payment required",
      accepts: [
        {
          scheme: "solana-transfer",
          network: "solana-mainnet",
          recipient: RECIPIENT,
          amount: `${PRICE_SOL} SOL`,
          flow: "POST /api/scan/intent {tag} -> pay the returned Solana Pay URL -> POST /api/scan/verify {intent} -> POST /api/scan/run {pass}",
        },
      ],
    },
    { status: 402 }
  );
}

export async function GET() {
  return paymentRequired();
}

export async function POST(req: Request) {
  if (!configured()) return NextResponse.json({ error: "scanner offline" }, { status: 503 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const pass = open(String(body.pass || ""));
  if (!pass || pass.k !== "p") return paymentRequired();
  try {
    const posts = await searchViral(pass.tag);
    return NextResponse.json({ tag: pass.tag, posts, fetchedAt: new Date().toISOString() });
  } catch (e: any) {
    const code = e instanceof ScanError ? e.code : 502;
    return NextResponse.json({ error: e?.message || "scan failed" }, { status: code });
  }
}
