import "server-only";
import { getSupabase } from "./supabase";

// Abuse protection for the public chat endpoint.
// Defaults can be changed in .env.local / Vercel without code changes.
const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const WINDOW_SECONDS = 600; // 10 minutes
const WINDOW_MAX = num(process.env.RATE_LIMIT_PER_10_MIN, 20);
const VISITOR_DAILY_MAX = num(process.env.RATE_LIMIT_PER_DAY, 80);
const GLOBAL_DAILY_MAX = num(process.env.DAILY_MESSAGE_CAP, 3000);

export type LimitResult = "ok" | "visitor_window" | "visitor_daily" | "global_daily";

// Fallback when Supabase isn't set up (or the SQL function is missing):
// per-server memory. Fine for local dev; Supabase is what protects production.
const memory = new Map<string, number[]>();
let globalHits: number[] = [];

function checkInMemory(visitor: string): LimitResult {
  const now = Date.now();
  const day = now - 86_400_000;
  const hits = (memory.get(visitor) ?? []).filter((t) => t > day);
  globalHits = globalHits.filter((t) => t > day);
  if (hits.filter((t) => t > now - WINDOW_SECONDS * 1000).length >= WINDOW_MAX) return "visitor_window";
  if (hits.length >= VISITOR_DAILY_MAX) return "visitor_daily";
  if (globalHits.length >= GLOBAL_DAILY_MAX) return "global_daily";
  hits.push(now);
  globalHits.push(now);
  memory.set(visitor, hits);
  return "ok";
}

let warned = false;

export async function checkRateLimit(visitor: string): Promise<LimitResult> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.rpc("check_chat_rate_limit", {
      p_visitor: visitor,
      p_window_seconds: WINDOW_SECONDS,
      p_window_max: WINDOW_MAX,
      p_visitor_daily_max: VISITOR_DAILY_MAX,
      p_global_daily_max: GLOBAL_DAILY_MAX,
    });
    if (!error && typeof data === "string") return data as LimitResult;
    if (!warned) {
      warned = true;
      console.warn("Rate limit: Supabase check failed, using memory fallback. Run supabase/schema.sql.", error?.message);
    }
  }
  return checkInMemory(visitor);
}
