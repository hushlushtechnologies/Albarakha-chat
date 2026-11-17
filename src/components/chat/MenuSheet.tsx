"use client";

import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, X } from "lucide-react";

export type SheetItem = { key: string; icon: LucideIcon; title: string; onSelect: () => void };

// "How can we help?" sheet that slides up over the chat (menu button, bottom left).
export function MenuSheet({
  open,
  title,
  closeLabel,
  items,
  onClose,
}: {
  open: boolean;
  title: string;
  closeLabel: string;
  items: SheetItem[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-end" role="presentation">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 animate-[fade-in_0.25s_ease-out_both] bg-ink/75 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[88%] w-full animate-[sheet-up_0.4s_var(--ease-premium)_both] overflow-y-auto rounded-t-3xl border-t border-brand-light/20 bg-surface pb-3 shadow-[0_-30px_80px_-20px_rgb(0_0_0_/_0.8)] focus:outline-none"
      >
        <div className="sticky top-0 z-10 bg-surface px-5 pt-3 pb-2">
          <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-secondary/25" />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.16em] text-gold uppercase">{title}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="grid size-8 place-items-center rounded-full text-secondary/70 hover:text-brand-glow"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
        <ul className="px-2">
          {items.map(({ key, icon: Icon, title: label, onSelect }, i) => (
            <li key={key} className={i > 0 ? "border-t border-brand-light/10" : ""}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelect();
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition-colors hover:bg-brand/20"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold-surface text-gold">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="flex-1 text-[15px] font-medium text-primary">{label}</span>
                <ChevronRight
                  className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-light rtl:rotate-180"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
