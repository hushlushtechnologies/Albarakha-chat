"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Download, Loader2, LogOut, MessageCircle, Phone, RefreshCw, Search } from "lucide-react";
import { adminStrings, type AdminStrings } from "@/lib/admin/i18n";
import {
  filtersToParams,
  normalStatus,
  RANGES,
  SOURCES,
  STATUSES,
  type Lead,
  type LeadFilters,
  type LeadStatus,
  type Stats,
} from "@/lib/admin/shared";
import { ComingSoon } from "./ComingSoon";
import { telHref, waHref } from "./contactLinks";
import { LeadDrawer } from "./LeadDrawer";
import { StatusPill } from "./status";
import { LangToggle, ThemeToggle, themeClass, useAdminLang, useAdminTheme } from "./useAdminLang";

const POLL_MS = 60_000;
const START: LeadFilters = { q: "", status: "all", range: "all", source: "all" };

type Load = "loading" | "ready" | "error" | "no_database";

export function AdminDashboard({ staff }: { staff: string }) {
  const [lang, setLang] = useAdminLang();
  const [theme, toggleTheme] = useAdminTheme();
  const t = adminStrings[lang];
  const router = useRouter();

  const [filters, setFilters] = useState<LeadFilters>(START);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<Load>("loading");
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const since = useRef<string | null>(null);

  // Debounce typing into the search box.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search })), 300);
    return () => clearTimeout(id);
  }, [search]);

  const fetchPage = useCallback(async (f: LeadFilters, p: number) => {
    const params = filtersToParams(f);
    params.set("page", String(p));
    const res = await fetch(`/api/admin/leads?${params}`, { cache: "no-store" });
    if (res.status === 401) {
      window.location.reload();
      return null;
    }
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "" }));
      throw new Error(error || "failed");
    }
    return (await res.json()) as { leads: Lead[]; total: number; stats: Stats };
  }, []);

  // Loads the first page for the current filters (and again every minute).
  const refresh = useCallback(
    async (quiet = false) => {
      if (!quiet) setBusy(true);
      try {
        const data = await fetchPage(filters, 0);
        if (!data) return;
        // Leads that arrive after the dashboard was opened get a "new" marker.
        const newest = data.leads.reduce((m, l) => (l.created_at > m ? l.created_at : m), "");
        if (since.current === null) {
          since.current = newest || new Date().toISOString();
        } else {
          const after = since.current;
          const arrived = data.leads.filter((l) => l.created_at > after).map((l) => l.id);
          if (arrived.length) setFresh((prev) => new Set([...prev, ...arrived]));
          if (newest > after) since.current = newest;
        }
        setLeads(data.leads);
        setTotal(data.total);
        setStats(data.stats);
        setPage(0);
        setState("ready");
        setUpdatedAt(new Date());
      } catch (err) {
        setState((err as Error).message === "no_database" ? "no_database" : "error");
      } finally {
        setBusy(false);
      }
    },
    [fetchPage, filters],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading data for the current filters
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh(true);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Unread count in the browser tab, so a background tab still shows new leads.
  useEffect(() => {
    document.title = fresh.size ? `(${fresh.size}) ${t.title} | Albarakha` : `${t.title} | Albarakha`;
  }, [fresh.size, t.title]);

  async function loadMore() {
    setBusy(true);
    try {
      const data = await fetchPage(filters, page + 1);
      if (data) {
        setLeads((prev) => [...prev, ...data.leads.filter((l) => !prev.some((p) => p.id === l.id))]);
        setTotal(data.total);
        setPage(page + 1);
      }
    } catch {
      setState("error");
    }
    setBusy(false);
  }

  function open(id: string) {
    setOpenId(id);
    setFresh((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function onSaved(lead: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
    void refresh(true);
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  }

  const set = (patch: Partial<LeadFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const exportHref = `/api/admin/export?${filtersToParams(filters)}`;
  const openLead = leads.find((l) => l.id === openId) ?? null;
  const filtered = filters.q || filters.status !== "all" || filters.range !== "all" || filters.source !== "all";

  return (
    <div dir={t.dir} lang={lang} className={`${themeClass(theme)} min-h-dvh bg-ink text-primary`}>
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-line/[0.06] bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-gold/40 bg-gold-surface">
            <Image src="/logo-mark.svg" alt="" width={22} height={24} className="h-5 w-auto" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-primary">Albarakha Investment</p>
            <p className="truncate text-xs text-muted">
              {t.signedInAs} <span className="text-secondary">{staff}</span>
            </p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <ThemeToggle theme={theme} toggle={toggleTheme} label={theme === "dark" ? t.toLight : t.toDark} />
            <LangToggle lang={lang} setLang={setLang} />
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-line/10 px-3 py-1.5 text-xs text-secondary/80 hover:border-line/25 hover:text-primary"
            >
              <LogOut className="size-3.5 rtl:-scale-x-100" aria-hidden />
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 pt-6 pb-16 sm:px-6 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary sm:text-3xl">{t.title}</h1>
            <p className="mt-1 text-sm text-secondary/70">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:inline" aria-live="polite">
              {updatedAt && `${t.updated} ${updatedAt.toLocaleTimeString(lang === "ar" ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
            <button
              type="button"
              onClick={() => refresh()}
              aria-label={t.refresh}
              title={t.refresh}
              className="grid size-10 place-items-center rounded-full border border-line/10 text-secondary hover:border-line/25 hover:text-primary"
            >
              <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
            </button>
            <a href={exportHref} className="btn-gold px-4 py-2 text-sm">
              <Download className="size-4" aria-hidden />
              {t.export}
            </a>
          </div>
        </div>

        {/* ── Stats ── */}
        <StatsRow stats={stats} t={t} filters={filters} set={set} />

        {fresh.size > 0 && (
          <div role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
            <Bell className="size-4" aria-hidden />
            {t.newArrived(fresh.size)}
          </div>
        )}

        {/* ── Filters ── */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block lg:w-80">
            <span className="sr-only">{t.search}</span>
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full rounded-full border border-line/10 bg-surface py-2.5 ps-10 pe-4 text-sm text-primary placeholder:text-muted outline-none focus:border-brand-light"
            />
          </label>

          <div className="scroll-thin -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0" role="group" aria-label={t.col.status}>
            {(["all", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ status: s })}
                aria-pressed={filters.status === s}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-xs whitespace-nowrap transition-colors ${
                  filters.status === s
                    ? "border-brand-light/60 bg-brand text-white"
                    : "border-line/10 text-secondary/80 hover:border-line/25 hover:text-primary"
                }`}
              >
                {s === "all" ? t.all : t.status[s]}
              </button>
            ))}
          </div>

          <div className="flex gap-2 lg:ms-auto">
            <Select value={filters.range} onChange={(v) => set({ range: v as LeadFilters["range"] })} label={t.col.received}>
              {RANGES.map((r) => (
                <option key={r} value={r}>{t.range[r]}</option>
              ))}
            </Select>
            <Select value={filters.source} onChange={(v) => set({ source: v as LeadFilters["source"] })} label={t.col.source}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{t.source[s]}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* ── List ── */}
        <section className="mt-5">
          {state === "loading" ? (
            <Skeleton />
          ) : state === "error" || state === "no_database" ? (
            <div className="rounded-3xl border border-line/10 bg-surface px-6 py-12 text-center">
              <p className="text-secondary">{state === "no_database" ? t.noDatabase : t.loadError}</p>
              {state === "error" && (
                <button type="button" onClick={() => refresh()} className="btn-primary mt-5 px-5 py-2 text-sm">
                  {t.retry}
                </button>
              )}
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line/10 px-6 py-14 text-center text-secondary/70">
              {filtered ? t.empty : t.emptyAll}
            </div>
          ) : (
            <>
              <LeadTable leads={leads} t={t} staff={staff} fresh={fresh} onOpen={open} />
              <LeadCards leads={leads} t={t} staff={staff} fresh={fresh} onOpen={open} />
              <div className="mt-5 flex flex-col items-center gap-3 text-xs text-muted">
                <p>{t.showing(leads.length, total)}</p>
                {leads.length < total && (
                  <button type="button" onClick={loadMore} disabled={busy} className="btn-gold px-5 py-2 text-sm">
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {t.loadMore}
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <ComingSoon t={t} />
      </main>

      {openLead && <LeadDrawer lead={openLead} staff={staff} t={t} lang={lang} onClose={() => setOpenId(null)} onSaved={onSaved} />}
    </div>
  );
}

function StatsRow({
  stats,
  t,
  filters,
  set,
}: {
  stats: Stats | null;
  t: AdminStrings;
  filters: LeadFilters;
  set: (p: Partial<LeadFilters>) => void;
}) {
  const cards: { key: keyof Stats; apply: Partial<LeadFilters>; accent?: boolean }[] = [
    { key: "fresh", apply: { status: "new", range: "all" }, accent: true },
    { key: "today", apply: { status: "all", range: "today" } },
    { key: "week", apply: { status: "all", range: "7d" } },
    { key: "meeting", apply: { status: "meeting", range: "all" } },
    { key: "won", apply: { status: "won", range: "all" } },
  ];
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map(({ key, apply, accent }) => {
        const active = filters.status === (apply.status ?? "all") && filters.range === (apply.range ?? "all");
        return (
          <button
            key={key}
            type="button"
            onClick={() => set(apply)}
            aria-pressed={active}
            className={`rounded-2xl border p-3 text-start sm:p-4 transition-colors ${
              active ? "border-brand-light/50 bg-brand/25" : "border-line/[0.07] bg-surface hover:border-line/20"
            } ${key === "fresh" ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <p className={`text-xs ${accent ? "text-gold" : "text-secondary/70"}`}>{t.stats[key]}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums sm:mt-2 sm:text-3xl text-primary">
              {stats ? stats[key] : <span className="inline-block h-8 w-10 animate-pulse rounded bg-line/5" />}
            </p>
          </button>
        );
      })}
    </div>
  );
}

function Select({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-0 flex-1 rounded-full border border-line/10 bg-surface px-4 py-2.5 text-sm text-primary outline-none focus:border-brand-light lg:flex-none"
    >
      {children}
    </select>
  );
}

type ListProps = { leads: Lead[]; t: AdminStrings; staff: string; fresh: Set<string>; onOpen: (id: string) => void };

const contactLabel = (l: Lead, t: AdminStrings) => t.method[l.contact_method ?? "chat"] ?? l.contact_method;
const sourceLabel = (l: Lead, t: AdminStrings) => {
  const s = (l.source ?? "direct") as keyof AdminStrings["source"];
  return t.source[s] ?? l.source;
};
const greeting = (l: Lead, t: AdminStrings, staff: string) => t.waGreeting((l.name ?? "").split(" ")[0] || "", staff);

function QuickActions({ lead, t, staff }: { lead: Lead; t: AdminStrings; staff: string }) {
  const tel = telHref(lead.phone);
  const wa = waHref(lead.phone, greeting(lead, t, staff));
  const cls = "grid size-9 place-items-center rounded-full border border-line/10 text-secondary hover:border-brand-light/60 hover:text-brand-light";
  return (
    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      {tel && (
        <a href={tel} className={cls} aria-label={`${t.call} ${lead.name ?? ""}`} title={t.call}>
          <Phone className="size-4" aria-hidden />
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={cls} aria-label={`${t.whatsapp} ${lead.name ?? ""}`} title={t.whatsapp}>
          <MessageCircle className="size-4" aria-hidden />
        </a>
      )}
    </div>
  );
}

function NewDot({ show }: { show: boolean }) {
  return show ? <span className="me-2 inline-block size-2 shrink-0 animate-pulse rounded-full bg-gold" aria-label="new" /> : null;
}

function LeadTable({ leads, t, staff, fresh, onOpen }: ListProps) {
  return (
    <div className="hidden overflow-hidden rounded-3xl border border-line/[0.07] bg-surface md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line/[0.07] text-start text-xs text-muted">
            {[t.col.received, t.col.name, t.col.phone, t.col.interest, t.col.contact, t.col.source, t.col.status, ""].map((h, i) => (
              <th key={i} scope="col" className="px-4 py-3 text-start font-normal">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr
              key={l.id}
              onClick={() => onOpen(l.id)}
              className={`cursor-pointer border-b border-line/[0.05] last:border-0 hover:bg-line/[0.03] ${fresh.has(l.id) ? "bg-gold/[0.05]" : ""}`}
            >
              <td className="px-4 py-3.5 whitespace-nowrap text-secondary/70" title={l.created_at}>
                <span className="inline-flex items-center"><NewDot show={fresh.has(l.id)} />{t.relative(l.created_at)}</span>
              </td>
              <td className="max-w-48 px-4 py-3.5">
                <button type="button" className="truncate text-start font-medium text-primary hover:text-brand-light" onClick={() => onOpen(l.id)}>
                  {l.name || t.noName}
                </button>
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap text-secondary" dir="ltr">{l.phone}</td>
              <td className="max-w-56 truncate px-4 py-3.5 text-secondary/80">{l.requirement || "—"}</td>
              <td className="px-4 py-3.5 text-secondary/80">
                <p className="whitespace-nowrap">{contactLabel(l, t)}</p>
                {l.preferred_time && <p className="mt-0.5 max-w-48 truncate text-xs text-muted">{l.preferred_time}</p>}
              </td>
              <td className="px-4 py-3.5 text-secondary/80">
                <p className="whitespace-nowrap">{sourceLabel(l, t)}</p>
                {l.utm_campaign && <p className="mt-0.5 max-w-40 truncate text-xs text-muted">{l.utm_campaign}</p>}
              </td>
              <td className="px-4 py-3.5">
                <StatusPill status={normalStatus(l.status)} label={t.status[normalStatus(l.status)]} />
              </td>
              <td className="px-4 py-3.5"><QuickActions lead={l} t={t} staff={staff} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadCards({ leads, t, staff, fresh, onOpen }: ListProps) {
  return (
    <ul className="space-y-3 md:hidden">
      {leads.map((l) => {
        const status: LeadStatus = normalStatus(l.status);
        return (
          <li key={l.id} className={`rounded-2xl border bg-surface p-4 ${fresh.has(l.id) ? "border-gold/40" : "border-line/[0.07]"}`}>
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => onOpen(l.id)} className="min-w-0 flex-1 text-start">
                <p className="flex items-center truncate font-medium text-primary"><NewDot show={fresh.has(l.id)} />{l.name || t.noName}</p>
                <p className="mt-0.5 text-sm text-secondary/80" dir="ltr" style={{ textAlign: "start" }}>{l.phone}</p>
              </button>
              <StatusPill status={status} label={t.status[status]} />
            </div>
            <button type="button" onClick={() => onOpen(l.id)} className="mt-3 block w-full text-start text-sm text-secondary/70">
              {[l.requirement, contactLabel(l, t), l.preferred_time].filter(Boolean).join(" · ")}
            </button>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted">{t.relative(l.created_at)} · {sourceLabel(l, t)}</p>
              <QuickActions lead={l} t={t} staff={staff} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-line/[0.03]" />
      ))}
    </div>
  );
}

