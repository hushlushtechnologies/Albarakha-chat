import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { digitsOnly, PAGE_SIZE, rangeStart, type Lead, type LeadFilters, type Stats } from "./shared";

export const LEAD_COLUMNS =
  "id,created_at,name,phone,email,requirement,investor_type,budget,timeline,notes,staff_notes,status,contact_method,preferred_contact,preferred_time,language,source,utm_source,utm_medium,utm_campaign,utm_content,page_url,updated_at,updated_by,contacted_at";

// Builds the filtered query. Search text is reduced to safe characters so it
// can't change the PostgREST filter syntax.
export function leadQuery(supabase: SupabaseClient, f: LeadFilters, opts: { count?: boolean } = {}) {
  let query = supabase
    .from("leads")
    .select(LEAD_COLUMNS, opts.count ? { count: "exact" } : undefined)
    .order("created_at", { ascending: false });

  if (f.status !== "all") {
    query = f.status === "new" ? query.or("status.eq.new,status.is.null") : query.eq("status", f.status);
  }
  const since = rangeStart(f.range);
  if (since) query = query.gte("created_at", since);
  if (f.source !== "all") {
    query = f.source === "direct" ? query.or("source.eq.direct,source.is.null") : query.eq("source", f.source);
  }

  const text = f.q.replace(/[^\p{L}\p{N}@.\s_-]/gu, " ").trim().slice(0, 60);
  if (text) {
    const like = `*${text.replace(/\s+/g, "*")}*`;
    const parts = [`name.ilike.${like}`, `email.ilike.${like}`, `requirement.ilike.${like}`, `utm_campaign.ilike.${like}`];
    // "054 571 3199", "+971545713199" and "0545713199" all find the same lead.
    const digits = digitsOnly(text).replace(/^0+/, "");
    if (digits.length >= 4) parts.push(`phone_digits.ilike.*${digits}*`);
    query = query.or(parts.join(","));
  }
  return query;
}

export async function listLeads(supabase: SupabaseClient, f: LeadFilters, page: number) {
  const from = Math.max(0, page) * PAGE_SIZE;
  const { data, error, count } = await leadQuery(supabase, f, { count: true }).range(from, from + PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  return { leads: (data ?? []) as unknown as Lead[], total: count ?? 0 };
}

export async function getStats(supabase: SupabaseClient): Promise<Stats> {
  const count = async (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const { count: n, error } = await build(base());
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  const base = () => supabase.from("leads").select("id", { count: "exact", head: true });
  const [fresh, today, week, meeting, won] = await Promise.all([
    count((q) => q.or("status.eq.new,status.is.null")),
    count((q) => q.gte("created_at", rangeStart("today")!)),
    count((q) => q.gte("created_at", rangeStart("7d")!)),
    count((q) => q.eq("status", "meeting")),
    count((q) => q.eq("status", "won")),
  ]);
  return { fresh, today, week, meeting, won };
}
