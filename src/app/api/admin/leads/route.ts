import { currentStaff } from "@/lib/admin/auth";
import { getStats, listLeads } from "@/lib/admin/leads";
import { paramsToFilters } from "@/lib/admin/shared";
import { getSupabase } from "@/lib/supabase";


export async function GET(req: Request) {
  if (!(await currentStaff())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return Response.json({ error: "no_database" }, { status: 503 });

  const params = new URL(req.url).searchParams;
  const page = Math.min(200, Math.max(0, Number(params.get("page")) || 0));
  try {
    const [list, stats] = await Promise.all([listLeads(supabase, paramsToFilters(params), page), getStats(supabase)]);
    return Response.json({ ...list, stats }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Admin leads query failed:", (err as Error).message);
    return Response.json({ error: "query_failed" }, { status: 500 });
  }
}
