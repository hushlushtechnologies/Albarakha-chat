"use client";

import { useState } from "react";
import { Briefcase, Building2, Coins, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { trackPixel } from "@/components/MetaPixel";
import { content } from "@/lib/content";
import type { Lang, Strings } from "@/lib/i18n";
import { termsFor, type Opportunity } from "@/lib/opportunities";
import { site } from "@/lib/site";

export const OPPORTUNITY_ICONS: Record<string, LucideIcon> = {
  "real-estate": Building2,
  business: Briefcase,
  income: Coins,
  growth: TrendingUp,
  structured: ShieldCheck,
};

const TONES: Record<Opportunity["tone"], string> = {
  emerald: "from-[#0b5b46] via-[#0a3a2d] to-[#07100c]",
  gold: "from-[#5a4706] via-[#2a2405] to-[#07100c]",
  teal: "from-[#0e5560] via-[#0a2f33] to-[#07100c]",
  jade: "from-[#1d6b45] via-[#0f3a26] to-[#07100c]",
  olive: "from-[#3f4d1a] via-[#222a10] to-[#07100c]",
};

const fmt = (n: number) => new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(Math.round(n));

export function OpportunityCard({ opp, lang, t }: { opp: Opportunity; lang: Lang; t: Strings }) {
  const { terms, isDemo } = termsFor(opp);
  const Icon = OPPORTUNITY_ICONS[opp.id] ?? Building2;
  const pending = <span className="text-secondary/60">{t.inConsultation}</span>;

  return (
    <article className="overflow-hidden rounded-2xl border border-brand-light/15 bg-ink/50">
      {/* Header */}
      <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${TONES[opp.tone]}`}>
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <Icon aria-hidden className="absolute -end-3 -top-3 size-32 text-gold/25" strokeWidth={1} />
        {isDemo && (
          <span className="absolute top-3 start-3 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink uppercase">
            {t.demoBadge}
          </span>
        )}
        <h3 className="absolute bottom-3 start-4 text-xl font-semibold text-primary">{opp.title[lang]}</h3>
      </div>

      <div className="border-b border-brand-light/10 px-4 py-3">
        <p className="font-medium text-primary italic">“{opp.tagline[lang]}”</p>
        <p className="mt-0.5 text-sm text-secondary/70">{opp.summary[lang]}</p>
      </div>

      {/* Terms */}
      <dl className="grid grid-cols-2 text-sm">
        <Field label={t.risk}>{terms.risk ? t.riskLevels[terms.risk] : pending}</Field>
        <Field label={t.minimum} start>
          {terms.minimumAed ? `AED ${fmt(terms.minimumAed)}` : pending}
        </Field>
        <Field label={t.period}>{terms.period ? terms.period[lang] : pending}</Field>
        <Field label={t.targetReturn} start>
          {terms.targetReturnPct ? <span className="text-brand-glow">{t.upToYear(terms.targetReturnPct)}</span> : pending}
        </Field>
        <Field label={t.payouts} wide>
          {terms.payouts ? terms.payouts[lang] : pending}
        </Field>
      </dl>

      <div className="border-t border-brand-light/10 px-4 py-3.5">
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t.overview}</p>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-secondary">{opp.overview[lang]}</p>
      </div>

      {terms.targetReturnPct && (
        <Calculator opp={opp} pct={terms.targetReturnPct} minimum={terms.minimumAed} payoutOptions={terms.payoutOptions} lang={lang} t={t} />
      )}

      {content.showDisclaimers && (
        <p className="border-t border-brand-light/10 px-4 py-3 text-xs leading-relaxed text-muted">{t.returnsNote}</p>
      )}
    </article>
  );
}

function Field({ label, children, start = false, wide = false }: { label: string; children: React.ReactNode; start?: boolean; wide?: boolean }) {
  return (
    <div className={`border-t border-brand-light/10 px-4 py-3 ${start ? "border-s" : ""} ${wide ? "col-span-2" : ""}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-primary">{children}</dd>
    </div>
  );
}

function Calculator({
  opp,
  pct,
  minimum,
  payoutOptions,
  lang,
  t,
}: {
  opp: Opportunity;
  pct: number;
  minimum: number | null;
  payoutOptions: ("monthly" | "quarterly" | "yearly")[];
  lang: Lang;
  t: Strings;
}) {
  const [amountText, setAmountText] = useState(fmt(minimum ?? 100000));
  const [months, setMonths] = useState(12);
  const amount = Number(amountText.replace(/[^\d]/g, "")) || 0;
  const yearly = (amount * pct) / 100;
  const profit = (yearly * months) / 12;
  const payouts = { monthly: yearly / 12, quarterly: yearly / 4, yearly };

  const whatsapp = `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(
    t.calcWhatsappText(opp.title[lang], fmt(amount), months, pct),
  )}`;

  return (
    <div className="border-t border-brand-light/10 px-4 py-4">
      <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t.calcTitle}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
        <label className="text-xs text-secondary/80">
          {t.calcAmount}
          <input
            inputMode="numeric"
            value={amountText}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
              setAmountText(digits ? fmt(Number(digits)) : "");
            }}
            className="mt-1 block w-full rounded-xl border border-brand-light/20 bg-ink/60 px-3 py-2.5 text-base text-primary focus:border-brand-light/60 focus:outline-none"
          />
        </label>
        <label className="text-xs text-secondary/80">
          {t.calcFor}
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-1 block rounded-xl border border-brand-light/20 bg-ink/60 px-3 py-2.5 text-base text-primary focus:border-brand-light/60 focus:outline-none"
          >
            {[12, 24, 36].map((m) => (
              <option key={m} value={m}>
                {t.months(m)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {minimum && amount > 0 && amount < minimum ? (
        <p className="mt-3 text-sm text-gold">{t.calcBelowMin(fmt(minimum))}</p>
      ) : (
        amount > 0 && (
          <p className="mt-3 text-sm leading-relaxed font-medium text-primary">
            {t.calcResult(pct, fmt(amount), months, fmt(profit), fmt(amount + profit))}
          </p>
        )
      )}

      {amount > 0 && payoutOptions.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t.payoutTitle}</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["monthly", "quarterly", "yearly"] as const)
              .filter((k) => payoutOptions.includes(k))
              .map((k) => (
                <div key={k} className="rounded-xl bg-brand/25 px-2 py-2 text-center">
                  <p className="text-[11px] text-secondary/70">{t[k]}</p>
                  <p className="text-sm font-semibold text-brand-glow">{t.upTo(fmt(payouts[k]))}</p>
                </div>
              ))}
          </div>
        </>
      )}

      {content.showDisclaimers && <p className="mt-3 text-xs leading-relaxed text-muted">{t.calcNote}</p>}
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackPixel("Contact", { method: "whatsapp", content_name: opp.title.en })}
        className="mt-3 flex w-full items-center justify-center rounded-full border border-secondary/30 py-2.5 text-sm font-medium text-primary transition-colors hover:border-brand-light hover:bg-brand/30"
      >
        {t.calcWhatsapp}
      </a>
    </div>
  );
}
