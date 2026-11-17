// Where a visitor came from. Captured in the browser and sent with every
// chat request, so each lead is stored with its ad / campaign / page.
export type Attribution = {
  source: "ad" | "website" | "direct";
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  page_url?: string;
};

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;
const STORAGE_KEY = "abk_attribution";

export function readAttribution(): Attribution {
  if (typeof window === "undefined") return { source: "direct" };

  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Attribution;
  } catch {}

  const params = new URLSearchParams(window.location.search);
  const result: Attribution = { source: "direct" };
  for (const key of KEYS) {
    const value = params.get(key);
    if (value) result[key] = value.slice(0, 200);
  }
  // The website widget passes the parent page via ?page= and ?src=website
  result.page_url = (params.get("page") || window.location.href).slice(0, 500);
  if (params.get("src") === "website") result.source = "website";
  else if (result.utm_source || result.fbclid) result.source = "ad";

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch {}
  return result;
}

export function getSessionId(): string {
  const KEY = "abk_session";
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
