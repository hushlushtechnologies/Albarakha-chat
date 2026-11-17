import type { Lang } from "./i18n";

// How a visitor can choose to speak with the team.
export type ContactMethod = "office" | "video" | "scheduled" | "callnow" | "whatsapp";
export type Preferred = "whatsapp" | "phone" | "email";
export type TimeWindow = "morning" | "afternoon" | "evening";

// Methods that need a day and time before the form.
export const needsTime = (m: ContactMethod) => m === "office" || m === "video" || m === "scheduled";

// Default "preferred way to contact you" for each method.
export const defaultPreferred: Record<ContactMethod, Preferred> = {
  office: "whatsapp",
  video: "whatsapp",
  scheduled: "phone",
  callnow: "phone",
  whatsapp: "whatsapp",
};

export const countries = [
  { code: "971", label: "UAE" },
  { code: "966", label: "KSA" },
  { code: "974", label: "Qatar" },
  { code: "965", label: "Kuwait" },
  { code: "973", label: "Bahrain" },
  { code: "968", label: "Oman" },
  { code: "91", label: "India" },
  { code: "92", label: "Pakistan" },
  { code: "20", label: "Egypt" },
  { code: "44", label: "UK" },
  { code: "1", label: "US/CA" },
] as const;

// Next 7 days in Dubai time, as { iso: "2026-11-15", label: "Sun 15 Nov" }.
export function nextDays(lang: Lang, count = 7) {
  const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Dubai",
  });
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dubai" });
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.now() + (i + 1) * 86_400_000);
    return { iso: iso.format(d), label: fmt.format(d) };
  });
}
