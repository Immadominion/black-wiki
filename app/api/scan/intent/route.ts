import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { b58, sign, configured, RECIPIENT, PRICE_SOL } from "@/lib/scan-server";

const TAG_RE = /^[A-Za-z0-9]{2,15}$/;

export async function POST(req: Request) {
  if (!configured()) return NextResponse.json({ error: "scanner offline" }, { status: 503 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const tag = String(body.tag || "").trim().replace(/^\$/, "").toUpperCase();
  if (!TAG_RE.test(tag)) {
    return NextResponse.json({ error: "ticker must be 2 to 15 letters or numbers" }, { status: 400 });
  }
  const reference = b58(randomBytes(32));
  const exp = Date.now() + 30 * 60_000;
  const intent = sign({ k: "i", tag, ref: reference, exp });
  const payUrl =
    `solana:${RECIPIENT}?amount=${PRICE_SOL}&reference=${reference}` +
    `&label=${encodeURIComponent("blackwiki.fun scanner")}&message=${encodeURIComponent(`scan $${tag}`)}`;
  return NextResponse.json({ tag, reference, recipient: RECIPIENT, amountSol: PRICE_SOL, payUrl, intent, exp });
}
