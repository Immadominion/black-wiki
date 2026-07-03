/* Server-only helpers for the Scanner (pay-per-use viral search).
   Secrets (HELIUS_RPC, X_BEARER_TOKEN, SCAN_SECRET) are read from env at
   request time and never reach the client. */

import { createHmac, timingSafeEqual } from "crypto";

export const RECIPIENT = process.env.SCAN_RECIPIENT || "3hqiCoEipSWk69Mx1iPWjxjCvNRPTYEbENSBpkWtLsAG"; // heisjoel.skr
export const PRICE_SOL = Number(process.env.SCAN_PRICE_SOL || "0.005");
export const PRICE_LAMPORTS = Math.round(PRICE_SOL * 1e9);

export const configured = () => Boolean(process.env.SCAN_SECRET && process.env.HELIUS_RPC && process.env.X_BEARER_TOKEN);

/* ---- base58 (enough to mint a Solana Pay reference key from 32 random bytes) ---- */
const ALPHA = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export function b58(bytes: Uint8Array): string {
  const digits: number[] = [];
  for (let bi = 0; bi < bytes.length; bi++) {
    let carry = bytes[bi];
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let bi = 0; bi < bytes.length && bytes[bi] === 0; bi++) digits.push(0);
  return digits.reverse().map((d) => ALPHA[d]).join("");
}

/* ---- stateless HMAC tokens: base64url(payload).base64url(mac) ---- */
export function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", process.env.SCAN_SECRET || "").update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function open(token: string): Record<string, any> | null {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", process.env.SCAN_SECRET || "").update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof p?.exp === "number" && p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

/* ---- Solana RPC ---- */
async function rpc(method: string, params: unknown[]): Promise<any> {
  const r = await fetch(process.env.HELIUS_RPC as string, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "rpc error");
  return j.result;
}

/* Confirm a fresh transfer of >= PRICE_LAMPORTS to RECIPIENT, either via the
   Solana Pay reference key or a pasted signature. Signatures are only kept in
   a warm-instance set; a cold start forgets them, which at this price point is
   an accepted tradeoff over running a database. */
const usedSigs = new Set<string>();

export async function findPayment(reference: string, signature?: string): Promise<{ sig: string } | null> {
  const candidates: string[] = [];
  if (signature) {
    candidates.push(signature);
  } else {
    const list = await rpc("getSignaturesForAddress", [reference, { limit: 8 }]);
    for (const s of list || []) if (!s.err) candidates.push(s.signature);
  }
  for (const sig of candidates) {
    if (usedSigs.has(sig)) continue;
    const tx = await rpc("getTransaction", [
      sig,
      { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 0 },
    ]);
    if (!tx || tx.meta?.err) continue;
    if (!tx.blockTime || Date.now() / 1000 - tx.blockTime > 45 * 60) continue;
    const keys: string[] = (tx.transaction?.message?.accountKeys || []).map((k: any) =>
      typeof k === "string" ? k : k.pubkey
    );
    const i = keys.indexOf(RECIPIENT);
    if (i < 0) continue;
    const delta = (tx.meta?.postBalances?.[i] ?? 0) - (tx.meta?.preBalances?.[i] ?? 0);
    if (delta >= PRICE_LAMPORTS) {
      usedSigs.add(sig);
      return { sig };
    }
  }
  return null;
}

/* ---- X recent search, ranked by views (the tool, live, for any tag) ---- */
export class ScanError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export async function searchViral(tag: string) {
  const u = new URL("https://api.x.com/2/tweets/search/recent");
  u.searchParams.set("query", `"$${tag}" -is:retweet`);
  u.searchParams.set("max_results", "100");
  u.searchParams.set("tweet.fields", "public_metrics,created_at,author_id,note_tweet");
  u.searchParams.set("expansions", "author_id");
  u.searchParams.set("user.fields", "name,username,profile_image_url");
  const r = await fetch(u, {
    headers: { authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
    cache: "no-store",
  });
  if (r.status === 429) throw new ScanError("X is rate limiting the scanner. Wait a minute and hit run again, your pass stays valid.", 503);
  if (r.status === 402 || r.status === 403) throw new ScanError("The scanner's X quota is exhausted right now. Your pass stays valid for 2 hours, try again soon.", 503);
  if (!r.ok) throw new ScanError(`X API error ${r.status}`, 502);
  const j = await r.json();
  const users = new Map<string, any>((j.includes?.users || []).map((usr: any) => [usr.id, usr]));
  return ((j.data as any[]) || [])
    .map((t) => {
      const usr = users.get(t.author_id);
      const pm = t.public_metrics || {};
      return {
        id: t.id as string,
        url: usr ? `https://x.com/${usr.username}/status/${t.id}` : `https://x.com/i/web/status/${t.id}`,
        author: usr ? { name: usr.name, handle: usr.username, avatar: usr.profile_image_url || null } : null,
        date: t.created_at as string,
        text: (t.note_tweet?.text || t.text || "") as string,
        views: pm.impression_count ?? 0,
        likes: pm.like_count ?? 0,
        rts: pm.retweet_count ?? 0,
        replies: pm.reply_count ?? 0,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 25);
}
