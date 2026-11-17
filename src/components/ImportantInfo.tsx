"use client";

import { useImperativeHandle, useRef, useSyncExternalStore, type Ref } from "react";
import { createPortal } from "react-dom";
import type { Lang } from "@/lib/i18n";
import { importantInfo } from "@/lib/importantInfo";

export type ImportantInfoHandle = { open: () => void };
type Props = { lang?: Lang; className?: string; handle?: Ref<ImportantInfoHandle> };

// "Important information" link that opens a modal.
// Uses the native <dialog>: Esc closes it, focus stays inside, and it
// renders above everything (also inside the website widget's iframe).
// The dialog is portalled to <body>: the link often sits inside a <p>, where a
// dialog is not allowed.
export function ImportantInfoLink({ lang = "en", className, handle }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const info = importantInfo[lang];
  const close = () => ref.current?.close();
  useImperativeHandle(handle, () => ({ open: () => ref.current?.showModal() }), []);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className={className}
      >
        {info.title}
      </button>

      {mounted &&
        createPortal(
          <dialog
            ref={ref}
            dir={lang === "ar" ? "rtl" : "ltr"}
            lang={lang}
            aria-labelledby={`important-info-title-${lang}`}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-[520px] rounded-3xl border border-brand-light/20 bg-surface p-0 text-start text-secondary shadow-[0_40px_120px_-30px_rgb(0_0_0_/_0.9)] backdrop:bg-ink/75 backdrop:backdrop-blur-sm"
          >
            <div className="max-h-[85dvh] overflow-y-auto p-6 sm:p-7">
              <h2
                id={`important-info-title-${lang}`}
                className="text-lg font-semibold text-primary"
              >
                {info.title}
              </h2>
              <div className="mt-4 space-y-3.5 text-[14.5px] leading-relaxed">
                {info.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <button
                type="button"
                onClick={close}
                autoFocus
                className="mt-6 w-full rounded-full border border-secondary/40 py-3 text-sm font-medium text-primary transition-colors hover:border-brand-light hover:bg-brand/30"
              >
                {info.close}
              </button>
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
