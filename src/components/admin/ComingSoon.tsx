import { BarChart3, BellRing, Headset, MessagesSquare, Star, UserCheck } from "lucide-react";
import type { AdminStrings } from "@/lib/admin/i18n";

const icons = { transcript: MessagesSquare, alerts: BellRing, assign: UserCheck, live: Headset, analytics: BarChart3, feedback: Star };

export function ComingSoon({ t }: { t: AdminStrings }) {
  return (
    <section className="mt-14" aria-labelledby="soon-title">
      <h2 id="soon-title" className="text-lg font-semibold text-primary">{t.soonTitle}</h2>
      <p className="mt-1 text-sm text-secondary/70">{t.soonHint}</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {t.soon.map((item) => {
          const Icon = icons[item.key as keyof typeof icons];
          return (
            <li key={item.key} className="relative rounded-2xl border border-dashed border-line/10 p-5">
              <span className="absolute end-4 top-4 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] text-gold">
                {t.soonBadge}
              </span>
              <div className="grid size-10 place-items-center rounded-xl bg-line/[0.04] text-secondary/60">
                <Icon className="size-5" aria-hidden />
              </div>
              <p className="mt-4 font-medium text-secondary">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
