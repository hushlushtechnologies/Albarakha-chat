"use client";

import { useMemo, useState } from "react";
import type { Lang, Strings } from "@/lib/i18n";
import { nextDays, type TimeWindow } from "@/lib/contact";

const WINDOWS: TimeWindow[] = ["morning", "afternoon", "evening"];

// Pick a day (next 7 days) and a time of day, in UAE time.
export function TimePicker({
  lang,
  t,
  disabled,
  onPick,
}: {
  lang: Lang;
  t: Strings;
  disabled?: boolean;
  onPick: (slot: { day: string; dayLabel: string; window: TimeWindow }) => void;
}) {
  const days = useMemo(() => nextDays(lang), [lang]);
  const [day, setDay] = useState(days[0].iso);
  const [win, setWin] = useState<TimeWindow>("morning");
  const chip = (active: boolean) =>
    `rounded-xl border px-3 py-2 text-sm transition-colors ${
      active ? "border-brand-light bg-brand/40 text-primary" : "border-brand-light/15 text-secondary hover:border-brand-light/50"
    }`;

  return (
    <div className={`rounded-2xl border border-brand-light/15 bg-ink/50 p-4 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t.pickDay}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {days.map((d) => (
          <button key={d.iso} type="button" onClick={() => setDay(d.iso)} aria-pressed={day === d.iso} className={chip(day === d.iso)}>
            {d.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs font-semibold tracking-[0.14em] text-gold uppercase">{t.pickWindow}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {WINDOWS.map((w) => (
          <button key={w} type="button" onClick={() => setWin(w)} aria-pressed={win === w} className={chip(win === w)}>
            {t.windows[w]}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPick({ day, dayLabel: days.find((d) => d.iso === day)!.label, window: win })}
        className="btn-primary mt-4 w-full py-3 text-sm"
      >
        {t.continue}
      </button>
    </div>
  );
}
