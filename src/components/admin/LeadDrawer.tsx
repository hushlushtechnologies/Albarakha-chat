"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, Mail, MessageCircle, Phone, X } from "lucide-react";
import { formatDate, type AdminLang, type AdminStrings } from "@/lib/admin/i18n";
import { normalStatus, STATUSES, type Activity, type Lead, type LeadStatus } from "@/lib/admin/shared";
import { telHref, waHref } from "./contactLinks";
import { statusStyle } from "./status";

type Props = {
  lead: Lead;
  staff: string;
  t: AdminStrings;
  lang: AdminLang;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
};

export function LeadDrawer(props: Props) {
  // Remount per lead so the notes box and history start fresh.
  return <Drawer key={props.lead.id} {...props} />;
}

function Drawer({ lead, staff, t, lang, onClose, onSaved }: Props) {
  const [status, setStatus] = useState<LeadStatus>(normalStatus(lead.status));
  const [notes, setNotes] = useState(lead.staff_notes ?? "");
  const [saving, setSaving] = useState<"status" | "notes" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string; kind: "status" | "notes" } | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const loadActivity = async () => {
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, { cache: "no-store" });
      if (res.ok) setActivity(((await res.json()) as { activity: Activity[] }).activity);
    } catch {}
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch this lead's history when it opens
    void loadActivity();
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(patch: { status?: LeadStatus; staffNotes?: string }, kind: "status" | "notes") {
    setSaving(kind);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.status === 401) return window.location.reload();
      if (!res.ok) throw new Error();
      const { lead: updated } = (await res.json()) as { lead: Lead };
      onSaved(updated);
      setMessage({ ok: true, text: t.saved, kind });
      void loadActivity();
    } catch {
      if (patch.status) setStatus(normalStatus(lead.status));
      setMessage({ ok: false, text: t.saveError, kind });
    }
    setSaving(null);
  }

  function changeStatus(next: LeadStatus) {
    if (next === status || saving) return;
    setStatus(next);
    void save({ status: next }, "status");
  }

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(lead.phone ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const first = (lead.name ?? "").split(" ")[0] || "";
  const tel = telHref(lead.phone);
  const wa = waHref(lead.phone, t.waGreeting(first, staff));
  const notesChanged = notes.trim() !== (lead.staff_notes ?? "").trim();

  const details: [string, string | null | undefined][] = [
    [t.f.received, formatDate(lead.created_at, lang)],
    [t.f.interest, lead.requirement],
    [t.f.investorType, lead.investor_type],
    [t.f.budget, lead.budget],
    [t.f.timeline, lead.timeline],
    [t.f.method, t.method[lead.contact_method ?? "chat"] ?? lead.contact_method],
    [t.f.time, lead.preferred_time],
    [t.f.preferred, lead.preferred_contact ? (t.preferred[lead.preferred_contact] ?? lead.preferred_contact) : null],
    [t.f.email, lead.email],
    [t.f.language, lead.language ? (t.langName[lead.language] ?? lead.language) : null],
    [t.f.source, t.source[(lead.source ?? "direct") as keyof AdminStrings["source"]] ?? lead.source],
    [t.f.campaign, lead.utm_campaign],
    [t.f.ad, lead.utm_content],
  ];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="lead-title">
      <button type="button" aria-label={t.close} onClick={onClose} className="absolute inset-0 animate-[fade-in_0.2s_ease-out] bg-black/50" />
      <div
        ref={panel}
        tabIndex={-1}
        className="scroll-thin absolute inset-y-0 end-0 flex w-full max-w-lg flex-col overflow-y-auto border-s border-line/10 bg-ink outline-none sm:shadow-2xl"
      >
        {/* Top */}
        <div className="sticky top-0 z-10 border-b border-line/[0.07] bg-ink/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id="lead-title" className="truncate text-xl font-semibold text-primary">{lead.name || t.noName}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-secondary" dir="ltr" style={{ justifyContent: lang === "ar" ? "flex-end" : "flex-start" }}>
                <span>{lead.phone}</span>
                {lead.phone && (
                  <button type="button" onClick={copyPhone} className="text-muted hover:text-primary" aria-label={t.copy} title={copied ? t.copied : t.copy}>
                    {copied ? <Check className="size-3.5 text-brand-light" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                  </button>
                )}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label={t.close} className="grid size-9 shrink-0 place-items-center rounded-full border border-line/10 text-secondary hover:text-primary">
              <X className="size-4" aria-hidden />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Action href={tel} icon={Phone} label={t.call} primary />
            <Action href={wa} icon={MessageCircle} label={t.whatsapp} external />
            <Action href={lead.email ? `mailto:${lead.email}` : null} icon={Mail} label={t.email} />
          </div>
        </div>

        <div className="flex-1 space-y-7 px-5 py-6 sm:px-6">
          {/* Status */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-xs tracking-wide text-muted uppercase">{t.changeStatus}</h3>
              {saving === "status" && <Loader2 className="size-3.5 animate-spin text-muted" aria-hidden />}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t.changeStatus}>
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={status === s}
                  onClick={() => changeStatus(s)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    status === s ? statusStyle[s].pill : "border-line/10 text-secondary/80 hover:border-line/25"
                  }`}
                >
                  <span className={`size-2 rounded-full ${statusStyle[s].dot}`} aria-hidden />
                  {t.status[s]}
                </button>
              ))}
            </div>
            {message?.kind === "status" && (
              <p role="status" className={`mt-2 rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-brand/30 text-brand-light" : "bg-danger/10 text-danger"}`}>
                {message.text}
              </p>
            )}
          </section>

          {/* Visitor's own words */}
          {lead.notes && (
            <section>
              <h3 className="text-xs tracking-wide text-muted uppercase">{t.visitorNotes}</h3>
              <p className="mt-2 rounded-2xl border border-line/[0.07] bg-surface p-4 text-sm leading-relaxed whitespace-pre-wrap text-secondary">{lead.notes}</p>
            </section>
          )}

          {/* Details */}
          <section>
            <h3 className="text-xs tracking-wide text-muted uppercase">{t.details}</h3>
            <dl className="mt-3 divide-y divide-line/[0.06] rounded-2xl border border-line/[0.07] bg-surface">
              {details
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-4 px-4 py-2.5 text-sm">
                    <dt className="w-32 shrink-0 text-muted">{k}</dt>
                    <dd className="min-w-0 break-words text-secondary">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {/* Team notes */}
          <section>
            <label htmlFor="team-notes" className="text-xs tracking-wide text-muted uppercase">{t.teamNotes}</label>
            <p className="mt-1 text-xs text-muted">{t.teamNotesHint}</p>
            <textarea
              id="team-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={4000}
              className="mt-2 w-full resize-y rounded-2xl border border-line/10 bg-surface p-4 text-sm text-primary outline-none focus:border-brand-light"
            />
            <button
              type="button"
              disabled={!notesChanged || saving !== null}
              onClick={() => save({ staffNotes: notes }, "notes")}
              className="btn-primary mt-2 px-5 py-2 text-sm"
            >
              {saving === "notes" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {saving === "notes" ? t.saving : t.save}
            </button>
            {message?.kind === "notes" && (
              <p role="status" className={`mt-2 rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-brand/30 text-brand-light" : "bg-danger/10 text-danger"}`}>
                {message.text}
              </p>
            )}
          </section>

          {/* History */}
          <section>
            <h3 className="text-xs tracking-wide text-muted uppercase">{t.history}</h3>
            {activity === null ? (
              <div className="mt-3 h-10 animate-pulse rounded-xl bg-line/[0.03]" />
            ) : activity.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t.noHistory}</p>
            ) : (
              <ol className="mt-3 space-y-3 border-s border-line/10 ps-4">
                {activity.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="text-secondary">
                      <span className="font-medium text-primary">{a.actor}</span>{" "}
                      {a.action === "status" ? t.movedTo(t.status[normalStatus(a.detail)]) : t.editedNotes}
                    </p>
                    <p className="text-xs text-muted">{formatDate(a.created_at, lang)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <p className="rounded-2xl border border-dashed border-line/10 p-4 text-xs text-muted">
            <span className="me-2 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-gold">{t.soonBadge}</span>
            {t.soon[0].title}: {t.soon[0].body}
          </p>
        </div>
      </div>
    </div>
  );
}

function Action({
  href,
  icon: Icon,
  label,
  primary,
  external,
}: {
  href: string | null;
  icon: typeof Phone;
  label: string;
  primary?: boolean;
  external?: boolean;
}) {
  const base = "flex items-center justify-center gap-2 rounded-full py-2.5 text-sm";
  if (!href) {
    return (
      <span className={`${base} cursor-not-allowed border border-line/5 text-muted/60`} aria-disabled="true">
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
    );
  }
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={primary ? `btn-primary ${base}` : `${base} border border-line/15 text-primary hover:border-brand-light/60`}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </a>
  );
}
