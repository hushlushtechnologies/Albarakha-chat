import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { requestInfo } from "@/lib/request";
import { getSupabase } from "@/lib/supabase";

// "Did you get the answer you were looking for?" when a visitor ends the chat.
const schema = z.object({
  rating: z.enum(["yes", "partly", "no"]),
  sessionId: z.string().max(64).optional(),
  language: z.enum(["en", "ar"]).optional(),
});

export async function POST(req: Request) {
  const visitor = requestInfo(req);
  if ((await checkRateLimit(visitor.visitor)) !== "ok") return Response.json({ error: "rate_limited" }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("chat_feedback").insert({
      rating: parsed.data.rating,
      session_id: parsed.data.sessionId ?? "unknown",
      language: parsed.data.language ?? "en",
    });
    if (error) console.error("Feedback insert failed:", error.message);
  }
  return Response.json({ ok: true });
}
