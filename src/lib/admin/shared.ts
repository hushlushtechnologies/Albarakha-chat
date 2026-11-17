// Shared by the dashboard UI and the admin API.

export const STATUSES = ["new", "contacted", "meeting", "won", "lost"] as const;
export type LeadStatus = (typeof STATUSES)[number];

export const RANGES = ["all", "today", "7d", "30d"] as const;
export type Range = (typeof RANGES)[number];

export const SOURCES = ["all", "ad", "website", "direct"] as const;
export type SourceFilter = (typeof SOURCES)[number];

export const PAGE_SIZE = 50;

export type Lead = {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  requirement: string | null;
  investor_type: string | null;
  budget: string | null;
  timeline: string | null;
  notes: string | null;
  staff_notes: string | null;
  status: string | null;
  contact_method: string | null;
  preferred_contact: string | null;
  preferred_time: string | null;
  language: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  page_url: string | null;
  updated_at: string | null;
  updated_by: string | null;
  contacted_at: string | null;
};

export type Activity = { id: number; created_at: string; actor: string | null; action: string; detail: string | null };

export type Stats = { fresh: number; today: number; week: number; meeting: number; won: number };

export type LeadFilters = { q: string; status: LeadStatus | "all"; range: Range; source: SourceFilter };

export const isStatus = (v: unknown): v is LeadStatus => STATUSES.includes(v as LeadStatus);
export const normalStatus = (v: string | null): LeadStatus => (isStatus(v) ? v : "new");

// Dubai is UTC+4 all year (no daylight saving).
const DUBAI_OFFSET = 4 * 3_600_000;
export function rangeStart(range: Range, now = Date.now()): string | null {
  if (range === "all") return null;
  const startOfDay = Math.floor((now + DUBAI_OFFSET) / 86_400_000) * 86_400_000 - DUBAI_OFFSET;
  const days = range === "today" ? 0 : range === "7d" ? 6 : 29;
  return new Date(startOfDay - days * 86_400_000).toISOString();
}

export function filtersToParams(f: LeadFilters) {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.status !== "all") p.set("status", f.status);
  if (f.range !== "all") p.set("range", f.range);
  if (f.source !== "all") p.set("source", f.source);
  return p;
}

export function paramsToFilters(p: URLSearchParams): LeadFilters {
  const status = p.get("status");
  const range = p.get("range") as Range;
  const source = p.get("source") as SourceFilter;
  return {
    q: (p.get("q") ?? "").slice(0, 80),
    status: isStatus(status) ? status : "all",
    range: RANGES.includes(range) ? range : "all",
    source: SOURCES.includes(source) ? source : "all",
  };
}

export const digitsOnly = (s: string) => s.replace(/\D/g, "");
