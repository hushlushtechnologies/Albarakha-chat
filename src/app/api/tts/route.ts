import { checkRateLimit } from "@/lib/rateLimit";
import { requestInfo } from "@/lib/request";

// Voice replies through ElevenLabs. The API key stays on the server.
// No key set → 404, and the chat uses the free browser voice instead.
//   ELEVENLABS_API_KEY      required to enable
//   ELEVENLABS_VOICE_ID     optional, defaults to "Sarah" (premade, works on the free plan;
//                           free accounts can't use Voice Library voices through the API)
//   ELEVENLABS_VOICE_ID_AR  optional, a different voice for Arabic
//   ELEVENLABS_MODEL        optional, defaults to eleven_flash_v2_5 (fast, multilingual incl. Arabic)
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah: mature, reassuring, confident
const MAX_CHARS = 600; // keeps each reply cheap in credits

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "disabled" }, { status: 404 });

  if ((await checkRateLimit(requestInfo(req).visitor)) !== "ok") {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { text?: unknown; lang?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : "";
  if (!text) return Response.json({ error: "invalid" }, { status: 400 });

  const voice =
    (body?.lang === "ar" && process.env.ELEVENLABS_VOICE_ID_AR) || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5" }),
      signal: AbortSignal.timeout(8000),
    },
  ).catch(() => null);

  if (!res?.ok || !res.body) {
    // Out of credits, bad key, etc. The browser falls back to its own voice.
    if (res) console.error("ElevenLabs error:", res.status, (await res.text()).slice(0, 200));
    return Response.json({ error: "tts_failed" }, { status: 502 });
  }

  return new Response(res.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
