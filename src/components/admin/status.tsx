import type { LeadStatus } from "@/lib/admin/shared";

export const statusStyle: Record<LeadStatus, { dot: string; pill: string }> = {
  new: { dot: "bg-gold", pill: "border-gold/40 bg-gold/10 text-gold" },
  contacted: { dot: "bg-info", pill: "border-info/35 bg-info/10 text-info" },
  meeting: { dot: "bg-brand-light", pill: "border-brand-light/40 bg-brand-light/10 text-brand-light" },
  won: { dot: "bg-brand-glow", pill: "border-brand-glow/50 bg-brand-glow/15 text-brand-glow" },
  lost: { dot: "bg-muted", pill: "border-line/10 bg-line/5 text-muted" },
};

export function StatusPill({ status, label }: { status: LeadStatus; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${statusStyle[status].pill}`}>
      <span className={`size-1.5 rounded-full ${statusStyle[status].dot}`} aria-hidden />
      {label}
    </span>
  );
}
