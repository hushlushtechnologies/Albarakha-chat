"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/i18n";

// Chat language, remembered for the browser session.
// Starts in Arabic for visitors whose browser is set to Arabic.
const KEY = "abk_lang";
const EVENT = "abk-lang-change";

function read(): Lang {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved === "ar" || saved === "en") return saved;
  } catch {}
  return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function useLang() {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Lang);
  const setLang = useCallback((next: Lang) => {
    try {
      sessionStorage.setItem(KEY, next);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [lang, setLang] as const;
}

// Time-of-day key in Dubai, null during server render.
type Daypart = "morning" | "afternoon" | "evening";
function daypart(): Daypart {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dubai" }).format(new Date()),
  );
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}
export function useDubaiDaypart(): Daypart | null {
  return useSyncExternalStore(
    () => () => {},
    daypart,
    () => null,
  );
}
