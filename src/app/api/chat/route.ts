import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  tool,
  type UIMessage,
} from "ai";
import { after } from "next/server";
import { z } from "zod";
import { getModel } from "@/lib/ai";
import type { Attribution } from "@/lib/attribution";
import { systemPrompt } from "@/lib/knowledge";
import { stripOptions } from "@/lib/replyOptions";
import { getOpportunity } from "@/lib/opportunities";
import { sendLeadToMeta } from "@/lib/metaCapi";
import { checkRateLimit } from "@/lib/rateLimit";
import { requestInfo } from "@/lib/request";
import { getSupabase } from "@/lib/supabase";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const maxDuration = 30;

const MAX_MESSAGES = 40;
const MAX_CHARS = 2000;

type ChatBody = {
  messages: UIMessage[];
  sessionId?: string;
  attribution?: Attribution;
  language?: "en" | "ar";
  viewing?: string | null;
  leadCaptured?: boolean;
};

function textOf(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

const clean = (value: string | undefined, max = 200) =>
  value ? value.toString().slice(0, max) : null;

export async function POST(req: Request) {
  const ai = getModel();
  if ("error" in ai) {
    return Response.json({ error: ai.error }, { status: 500 });
  }

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages.length > MAX_MESSAGES) {
    return Response.json({ error: "Conversation too long. Please refresh to start again." }, { status: 400 });
  }
  if (messages.some((m) => textOf(m).length > MAX_CHARS)) {
    return Response.json({ error: "Message too long." }, { status: 400 });
  }

  const visitor = requestInfo(req);
  const limit = await checkRateLimit(visitor.visitor);
  if (limit !== "ok") {
    return Response.json({ error: "rate_limited", reason: limit }, { status: 429 });
  }

  const sessionId = clean(body.sessionId, 64) ?? "unknown";
  const attribution: Attribution = body.attribution ?? { source: "direct" };
  const supabase = getSupabase();
  const viewing = getOpportunity(body.viewing);

  const result = streamText({
    model: ai.model,
    instructions: [
      systemPrompt,
      body.language === "ar" &&
        "LANGUAGE: The visitor selected Arabic. Reply in clear Modern Standard Arabic unless they write in English.",
      viewing &&
        `CONTEXT: The visitor has just been viewing the "${viewing.title.en}" opportunity card. If they ask about "this" or "it", they mean ${viewing.title.en}.`,
      body.leadCaptured &&
        "CONTEXT: The visitor has already submitted their contact details through the form. Do not ask for their name or number again, and do not call save_lead.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    messages: await convertToModelMessages(messages),
    // Chat replies are short and simple: skip the model's slow "thinking" step.
    // Thinking tokens also count toward maxOutputTokens, so keep headroom.
    reasoning: "minimal",
    maxOutputTokens: 1500,
    stopWhen: isStepCount(3),
    tools: {
      save_lead: tool({
        description:
          "Save the visitor as a consultation lead once you have their name and phone number. Include everything else you have learned.",
        inputSchema: z.object({
          name: z.string().min(2).describe("Visitor's full name"),
          phone: z.string().describe("Phone or WhatsApp number, with country code if given"),
          interest: z.string().optional().describe("What they want to invest in"),
          investorType: z.string().optional().describe("Individual, family or business"),
          budget: z.string().optional().describe("Approximate amount they are considering, as they said it"),
          timeline: z.string().optional().describe("When they plan to invest"),
          notes: z.string().optional().describe("Anything else useful for the advisor, one or two sentences"),
        }),
        execute: async (lead) => {
          const digits = lead.phone.replace(/[^\d]/g, "");
          if (digits.length < 7 || digits.length > 15) {
            return { saved: false, reason: "invalid_phone" as const };
          }

          const whatsappUrl = buildWhatsAppUrl(lead);
          const eventId = crypto.randomUUID();

          // Server-side Meta Lead event, sent after the reply so it adds no delay.
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

          if (supabase) {
            const { error } = await supabase.from("leads").insert({
              name: clean(lead.name, 120),
              phone: clean(lead.phone, 40),
              requirement: clean(lead.interest),
              investor_type: clean(lead.investorType, 60),
              budget: clean(lead.budget, 120),
              timeline: clean(lead.timeline, 120),
              notes: clean(lead.notes, 1000),
              session_id: sessionId,
              source: attribution.source,
              utm_source: clean(attribution.utm_source),
              utm_medium: clean(attribution.utm_medium),
              utm_campaign: clean(attribution.utm_campaign),
              utm_content: clean(attribution.utm_content),
              utm_term: clean(attribution.utm_term),
              fbclid: clean(attribution.fbclid, 500),
              page_url: clean(attribution.page_url, 500),
            });
            if (error) console.error("Lead insert failed:", error.message);
          } else {
            console.warn("Supabase not configured: lead not stored", lead.name);
          }

          // Saved or not, the visitor still gets the WhatsApp handover.
          return { saved: true, firstName: lead.name.split(" ")[0], whatsappUrl, eventId };
        },
      }),
    },
    onEnd: async ({ text }) => {
      if (!supabase) return;
      const lastUser = textOf(messages.at(-1));
      const rows = [
        lastUser && { session_id: sessionId, role: "user", content: lastUser.slice(0, MAX_CHARS) },
        text && { session_id: sessionId, role: "assistant", content: stripOptions(text).slice(0, 4000) },
      ].filter(Boolean);
      if (rows.length === 0) return;
      const { error } = await supabase.from("messages").insert(rows);
      if (error) console.error("Message insert failed:", error.message);
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
