import Image from "next/image";
import { Check, Lock } from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ImportantInfoLink } from "@/components/ImportantInfo";
import { content } from "@/lib/content";
import { legalLinks, site } from "@/lib/site";

// Landing page for Meta ad traffic: a simple brand panel + chat.
// Stats and office hours appear only once filled in src/lib/content.ts.
export default function Home() {
  const stats = content.stats.filter((s) => s.value);
  const points = content.trustPoints.filter((p) => p.confirmed);

  return (
    <main className="relative isolate min-h-dvh overflow-hidden lg:flex lg:items-center">
      <Backdrop />

      <div className="mx-auto flex min-h-dvh w-full max-w-[1280px] flex-col lg:grid lg:h-[min(100dvh,900px)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-16 lg:px-10 xl:gap-24">
        {/* ── Brand panel ── */}
        <section className="no-scrollbar hidden min-h-0 flex-col justify-between overflow-y-auto py-8 lg:flex [@media(max-height:760px)]:py-6">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-xl border border-gold/40 bg-gold-surface">
              <Image src="/logo-mark.svg" alt="" width={34} height={37} className="h-8 w-auto" priority />
            </div>
            <div>
              <p className="text-lg font-semibold text-primary">{site.shortName}</p>
              <p className="mt-0.5 text-[11px] tracking-[0.22em] text-secondary/70 uppercase">{site.locationLabel}</p>
            </div>
          </div>

          <div className="py-6 [@media(max-height:760px)]:py-4">
            <h1 className="max-w-xl font-display text-[clamp(1.875rem,1.5vw+1rem,2.75rem)] leading-[1.12] [@media(max-height:760px)]:text-[clamp(1.75rem,1.2vw+1rem,2.25rem)] font-semibold tracking-tight text-primary">
              {content.headline.lead} <span className="text-gold">{content.headline.accent}</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-secondary/80">
              {content.minimumInvestment
                ? `Opportunities from ${content.minimumInvestment}. ${content.subheadline}`
                : content.subheadline}
            </p>

            {stats.length > 0 && (
              <dl className="mt-7 flex max-w-lg gap-10">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dd className="font-display text-2xl font-semibold text-primary">{stat.value}</dd>
                    <dt className="mt-1 text-sm text-secondary/70">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            )}

            <ul className="mt-7 max-w-lg space-y-2.5 [@media(max-height:760px)]:mt-5">
              {points.map((p) => (
                <li key={p.text} className="flex gap-3 text-sm text-secondary">
                  <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                  <span className="leading-relaxed">{p.text}</span>
                </li>
              ))}
            </ul>

            {content.officeHours && (
              <p className="mt-6 text-sm text-secondary/80">
                <span className="text-primary">Office hours:</span> {content.officeHours}
              </p>
            )}
          </div>

          <div className="max-w-lg">
            <p className="flex items-center gap-2 text-[13px] text-secondary/80">
              <Lock className="size-3.5 text-gold" aria-hidden /> {content.confidentialNote}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {content.showDisclaimers && <>{content.disclaimer} </>}
              <ImportantInfoLink className="underline underline-offset-2 hover:text-brand-light" />
              {" · "}
              <a href={legalLinks.terms} className="underline underline-offset-2 hover:text-brand-light">
                Terms
              </a>
              {" · "}
              <a href={legalLinks.privacy} className="underline underline-offset-2 hover:text-brand-light">
                Privacy
              </a>
            </p>
          </div>
        </section>

        {/* ── Mobile header ── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 lg:hidden">
          <div className="grid size-10 place-items-center rounded-xl border border-gold/40 bg-gold-surface">
            <Image src="/logo-mark.svg" alt="" width={28} height={31} className="h-7 w-auto" priority />
          </div>
          <div>
            <p className="font-semibold text-primary">{site.shortName}</p>
            <p className="text-[11px] tracking-[0.2em] text-secondary/70 uppercase">{site.locationLabel}</p>
          </div>
        </div>

        {/* ── Chat ── */}
        <section className="flex flex-1 items-stretch px-2.5 pb-2.5 lg:items-center lg:px-0 lg:py-8">
          <div className="mx-auto flex h-[calc(100dvh-76px)] min-h-[520px] w-full max-w-[460px] flex-col lg:h-[min(820px,calc(100dvh-64px))] lg:max-w-none">
            <ChatWindow />
          </div>
        </section>
      </div>
    </main>
  );
}

// Green arc glow echoing the main site's hero.
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -bottom-[35%] -left-[25%] size-[820px] rounded-full border-[56px] border-brand-glow/10 blur-2xl" />
      <div className="absolute -bottom-[30%] -left-[17%] size-[680px] rounded-full border-[14px] border-brand-light/15 blur-md" />
      <div className="absolute top-1/2 right-[8%] size-[620px] -translate-y-1/2 rounded-full bg-brand-deep/25 blur-[140px]" />
    </div>
  );
}
