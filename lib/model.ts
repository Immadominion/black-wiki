import fs from "fs";
import path from "path";

export type Tx = { sig: string; ts: number; amount: number; usd: number | null };

export type Recipient = {
  rank: number;
  wallet: string;
  total: number;
  usd_at_drop: number | null;
  tx_count: number;
  txs: Tx[];
  first_ts: number;
  last_ts: number;
  balance_now: number;
  held_pct: number;
  status: "holding" | "partial" | "sold" | "unknown";
  identity: { type: string; name: string | null; twitter: string | null; url: string } | null;
  known_label: string | null;
};

export type Tweet = {
  id: string;
  url: string;
  author: { name: string; handle: string; avatar: string | null };
  date: string;
  text: string;
  likes: number | null;
  replies: number | null;
  photo: string | null;
  quoted: { handle: string; text: string } | null;
};

export type ArchiveTweet = {
  id: string;
  date: string;
  text: string;
  likes: number;
  rts: number;
  replies: number;
  is_reply: boolean;
  reply_to: string | null;
  photo: string | null;
  quoted_text: string | null;
};

export type Model = {
  generated_at: string;
  token: Record<string, any>;
  copycats: any[];
  market_snapshot: Record<string, any>;
  ansem: Record<string, any>;
  airdrop_wallet: string;
  mint: string;
  stats: Record<string, number | null>;
  airdrop_daily: { date: string; count: number; amount: number; usd: number }[];
  price_series: [number, number][];
  recipients: Recipient[];
  timeline: { date: string; event: string; sources?: string[] }[];
  tweets: Tweet[];
  archive: ArchiveTweet[];
  quotes: { text: string; who: string; context?: string; source?: string }[];
  open_questions: string[];
  sources: string[];
};

export function loadModel(): Model {
  const p = path.join(process.cwd(), "data", "model.json");
  return JSON.parse(fs.readFileSync(p, "utf-8")) as Model;
}
