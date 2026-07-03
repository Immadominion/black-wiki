import { NextResponse } from "next/server";
import { open, sign, configured, findPayment } from "@/lib/scan-server";

const SIG_RE = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

export async function POST(req: Request) {
  if (!configured()) return NextResponse.json({ error: "scanner offline" }, { status: 503 });
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const intent = open(String(body.intent || ""));
  if (!intent || intent.k !== "i") {
    return NextResponse.json({ error: "pay link expired, start the scan over" }, { status: 400 });
  }
  const raw = typeof body.signature === "string" ? body.signature.trim() : "";
  const signature = SIG_RE.test(raw) ? raw : undefined;
  let found: { sig: string } | null = null;
  try {
    found = await findPayment(intent.ref, signature);
  } catch {
    return NextResponse.json({ error: "rpc hiccup while checking, try again" }, { status: 502 });
  }
  if (!found) return NextResponse.json({ pending: true });
  const pass = sign({ k: "p", tag: intent.tag, sig: found.sig, exp: Date.now() + 2 * 3600_000 });
  return NextResponse.json({ pass, tag: intent.tag, signature: found.sig, exp: Date.now() + 2 * 3600_000 });
}
