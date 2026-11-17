import { currentStaff } from "@/lib/admin/auth";
import { leadQuery } from "@/lib/admin/leads";
import { paramsToFilters, type Lead } from "@/lib/admin/shared";
import { getSupabase } from "@/lib/supabase";


const COLUMNS: [string, (l: Lead) => string | null][] = [
  ["Received (Dubai)", (l) => new Date(l.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })],
  ["Name", (l) => l.name],
  ["Phone", (l) => l.phone],
  ["Email", (l) => l.email],
  ["Status", (l) => l.status ?? "new"],
  ["Interest", (l) => l.requirement],
  ["Investor type", (l) => l.investor_type],
  ["Budget", (l) => l.budget],
  ["Timeline", (l) => l.timeline],
  ["Contact method", (l) => l.contact_method],
  ["Preferred contact", (l) => l.preferred_contact],
  ["Preferred time", (l) => l.preferred_time],
  ["Language", (l) => l.language],
  ["Visitor notes", (l) => l.notes],
  ["Team notes", (l) => l.staff_notes],
  ["Source", (l) => l.source],
  ["UTM source", (l) => l.utm_source],
  ["Campaign", (l) => l.utm_campaign],
  ["Ad", (l) => l.utm_content],
  ["Last updated by", (l) => l.updated_by],
];

// Excel-safe CSV cell. Values starting with = + - @ get a leading tab so a
// spreadsheet shows them as text instead of running them as a formula.
function cell(value: string | null) {
  let v = (value ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t\r]/.test(v)) v = `\t${v}`;
  return /[",\n\t]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(req: Request) {
  if (!(await currentStaff())) return new Response("Unauthorized", { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return new Response("Database not configured", { status: 503 });

  const filters = paramsToFilters(new URL(req.url).searchParams);
  const rows: Lead[] = [];
  for (let from = 0; from < 20_000; from += 1000) {
    const { data, error } = await leadQuery(supabase, filters).range(from, from + 999);
    if (error) return new Response("Export failed", { status: 500 });
    rows.push(...((data ?? []) as unknown as Lead[]));
    if (!data || data.length < 1000) break;
  }

  const csv = [COLUMNS.map(([h]) => h).join(","), ...rows.map((l) => COLUMNS.map(([, get]) => cell(get(l))).join(","))].join(
    "\r\n",
  );
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  // BOM so Excel opens Arabic names correctly.
  return new Response(`﻿${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="albarakha-leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
