import "server-only";
import { sha256 } from "./request";

// Meta Conversions API: sends the Lead event from the server, so it still
// counts when ad blockers or iPhone privacy settings block the browser pixel.
// Shares the browser event's event_id, so Meta counts each lead once.
const API_VERSION = process.env.META_API_VERSION || "v26.0";

type LeadContext = {
  eventId: string;
  name: string;
  phone: string;
  sessionId: string;
  pageUrl?: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
};

export async function sendLeadToMeta(lead: LeadContext) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !token) return;

  // Meta's matching rules: lowercase names, phone as digits incl. country code.
  const phone = lead.phone.replace(/\D/g, "").replace(/^00/, "");
  const names = lead.name.trim().toLowerCase().replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean);
  const fbc = lead.fbc ?? (lead.fbclid ? `fb.1.${Date.now()}.${lead.fbclid}` : undefined);

  const userData: Record<string, unknown> = {
    ph: [sha256(phone)],
    external_id: [sha256(lead.sessionId)],
  };
  if (names[0]) userData.fn = [sha256(names[0])];
  if (names.length > 1) userData.ln = [sha256(names.at(-1)!)];
  if (lead.ip) userData.client_ip_address = lead.ip;
  if (lead.userAgent) userData.client_user_agent = lead.userAgent;
  if (lead.fbp) userData.fbp = lead.fbp;
  if (fbc) userData.fbc = fbc;

  const body = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.eventId,
        action_source: "website",
        event_source_url: lead.pageUrl,
        user_data: userData,
        custom_data: { content_name: "Investment consultation" },
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) console.error("Meta CAPI error:", res.status, (await res.text()).slice(0, 300));
  } catch (err) {
    console.error("Meta CAPI request failed:", err instanceof Error ? err.message : err);
  }
}
