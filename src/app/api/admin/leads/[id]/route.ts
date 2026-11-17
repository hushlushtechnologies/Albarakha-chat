import { z } from "zod";
import { currentStaff } from "@/lib/admin/auth";
import { LEAD_COLUMNS } from "@/lib/admin/leads";
import { STATUSES } from "@/lib/admin/shared";
import { getSupabase } from "@/lib/supabase";


type Ctx = { params: Promise<{ id: string }> };
const Id = z.uuid();

// One lead plus its activity history (who changed what, and when).
export async function GET(_req: Request, ctx: Ctx) {
  if (!(await currentStaff())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = Id.safeParse((await ctx.params).id);
  const supabase = getSupabase();
  if (!id.success) return Response.json({ error: "bad_id" }, { status: 400 });
  if (!supabase) return Response.json({ error: "no_database" }, { status: 503 });

  const [lead, activity] = await Promise.all([
    supabase.from("leads").select(LEAD_COLUMNS).eq("id", id.data).maybeSingle(),
    supabase
      .from("lead_activity")
      .select("id,created_at,actor,action,detail")
      .eq("lead_id", id.data)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (lead.error) return Response.json({ error: "query_failed" }, { status: 500 });
  if (!lead.data) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ lead: lead.data, activity: activity.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

const Patch = z
  .object({ status: z.enum(STATUSES).optional(), staffNotes: z.string().max(4000).optional() })
  .refine((b) => b.status !== undefined || b.staffNotes !== undefined);

export async function PATCH(req: Request, ctx: Ctx) {
  const staff = await currentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401 });
  const id = Id.safeParse((await ctx.params).id);
  const body = Patch.safeParse(await req.json().catch(() => null));
  const supabase = getSupabase();
  if (!id.success || !body.success) return Response.json({ error: "bad_request" }, { status: 400 });
  if (!supabase) return Response.json({ error: "no_database" }, { status: 503 });

  const { data: before } = await supabase.from("leads").select("status,contacted_at").eq("id", id.data).maybeSingle();
  if (!before) return Response.json({ error: "not_found" }, { status: 404 });

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now, updated_by: staff };
  const activity: { lead_id: string; actor: string; action: string; detail: string }[] = [];

  if (body.data.status && body.data.status !== (before.status ?? "new")) {
    update.status = body.data.status;
    if (body.data.status !== "new" && !before.contacted_at) update.contacted_at = now;
    activity.push({ lead_id: id.data, actor: staff, action: "status", detail: body.data.status });
  }
  if (body.data.staffNotes !== undefined) {
    const notes = body.data.staffNotes.trim();
    update.staff_notes = notes || null;
    activity.push({ lead_id: id.data, actor: staff, action: "note", detail: notes.slice(0, 280) });
  }

  const { data, error } = await supabase.from("leads").update(update).eq("id", id.data).select(LEAD_COLUMNS).single();
  if (error) {
    console.error("Lead update failed:", error.message);
    return Response.json({ error: "save_failed" }, { status: 500 });
  }
  if (activity.length) {
    const { error: logError } = await supabase.from("lead_activity").insert(activity);
    if (logError) console.error("Activity log failed:", logError.message);
  }
  return Response.json({ lead: data });
}
