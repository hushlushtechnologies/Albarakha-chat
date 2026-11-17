import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export type Option = {
  key: string;
  title: string;
  hint?: string;
  icon?: LucideIcon;
  onSelect: () => void;
};

// Tappable list of choices. Older lists stay visible but faded and inactive.
export function OptionList({ options, disabled = false }: { options: Option[]; disabled?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-brand-light/15 bg-ink/40 transition-opacity duration-500 ${
        disabled ? "pointer-events-none opacity-45" : ""
      }`}
    >
      {options.map(({ key, title, hint, icon: Icon, onSelect }, i) => (
        <button
          key={key}
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className={`group flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors duration-300 hover:bg-brand/20 ${
            i > 0 ? "border-t border-brand-light/10" : ""
          }`}
        >
          {Icon && (
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-gold/30 bg-gold-surface text-gold">
              <Icon className="size-4" aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-primary">{title}</span>
            {hint && <span className="block text-xs leading-snug text-muted">{hint}</span>}
          </span>
          <ChevronRight
            className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-light rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
