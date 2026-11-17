import { after } from "next/server";
import { z } from "zod";
import type { Attribution } from "@/lib/attribution";
import { strings } from "@/lib/i18n";
import { sendLeadToMeta } from "@/lib/metaCapi";
import { getOpportunity } from "@/lib/opportunities";
import { checkRateLimit } from "@/lib/rateLimit";
import { requestInfo } from "@/lib/request";
import { getSupabase } from "@/lib/supabase";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

// Contact form in the chat: validates, checks the captcha, saves the lead,
// and sends the Meta Lead event. Returns the pre-filled WhatsApp link.

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(24).refine((v) => {
    const digits = v.replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15;
  }),
  email: z.email().max(160).optional(),
  preferred: z.enum(["whatsapp", "phone", "email"]),
  method: z.enum(["office", "video", "scheduled", "callnow", "whatsapp"]),
  slot: z
    .object({
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      window: z.enum(["morning", "afternoon", "evening"]),
    })
    .optional(),
  opportunityId: z.string().max(40).optional(),
  consent: z.literal(true),
  captchaToken: z.string().max(2048).optional(),
  elapsedMs: z.number().int().nonnegative().optional(), // ms since the chat page opened
  language: z.enum(["en", "ar"]).optional(),
  sessionId: z.string().max(64).optional(),
  attribution: z.record(z.string(), z.string().max(500)).optional(),
});

const MIN_FILL_MS = 3000; // ms since the chat page opened

async function verifyCaptcha(token: string | undefined, ip: string | undefined) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // captcha not set up
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const visitor = requestInfo(req);
  const limit = await checkRateLimit(visitor.visitor);
  if (limit !== "ok") return Response.json({ error: "rate_limited" }, { status: 429 });

  let parsed;
  try {
    parsed = schema.safeParse(await req.json());
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const lead = parsed.data;

  // Submitted seconds after the page opened (or not from our page): treat as a bot.
  // Pretend success and save nothing, but still return a working WhatsApp link,
  // so a real person caught by mistake can reach the team.
  if (!lead.elapsedMs || lead.elapsedMs < MIN_FILL_MS) {
    console.warn("Lead ignored as likely bot (filled too fast):", lead.elapsedMs);
    return Response.json({
      whatsappUrl: buildWhatsAppUrl({ name: lead.name, phone: lead.phone }),
      firstName: lead.name.split(/\s+/)[0],
      eventId: "",
    });
  }

  if (!(await verifyCaptcha(lead.captchaToken, visitor.ip))) {
    return Response.json({ error: "captcha" }, { status: 400 });
  }

  const en = strings.en;
  const methodLabel = en.methods[lead.method].title;
  const when = lead.slot ? `${lead.slot.day}, ${en.windows[lead.slot.window]} (UAE time)` : null;
  const opportunity = getOpportunity(lead.opportunityId);
  const attribution = (lead.attribution ?? {}) as Partial<Attribution>;
  const sessionId = lead.sessionId ?? "unknown";
  const eventId = crypto.randomUUID();

  const whatsappUrl = buildWhatsAppUrl({
    name: lead.name,
    phone: lead.phone,
    interest: opportunity?.title.en,
    meeting: [methodLabel, when].filter(Boolean).join(" · "),
  });

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("leads").insert({
      name: lead.name,
      phone: lead.phone,
      email: lead.email ?? null,
      requirement: opportunity?.title.en ?? null,
      contact_method: lead.method,
      preferred_contact: lead.preferred,
      preferred_time: when,
      consent: true,
      consent_at: new Date().toISOString(),
      language: lead.language ?? "en",
      session_id: sessionId,
      source: attribution.source ?? "direct",
      utm_source: attribution.utm_source ?? null,
      utm_medium: attribution.utm_medium ?? null,
      utm_campaign: attribution.utm_campaign ?? null,
      utm_content: attribution.utm_content ?? null,
      utm_term: attribution.utm_term ?? null,
      fbclid: attribution.fbclid ?? null,
      page_url: attribution.page_url ?? null,
    });
    if (error) {
      console.error("Lead insert failed:", error.message);
      return Response.json({ error: "save_failed" }, { status: 500 });
    }
  } else {
    console.warn("Supabase not configured: lead not stored", lead.name);
  }

  after(() =>
    sendLeadToMeta({
      eventId,
      name: lead.name,
      phone: lead.phone,
      sessionId,
      pageUrl: attribution.page_url,
      fbclid: attribution.fbclid,
      ...visitor,
    }),
  );

  return Response.json({ whatsappUrl, firstName: lead.name.split(/\s+/)[0], eventId });
}
