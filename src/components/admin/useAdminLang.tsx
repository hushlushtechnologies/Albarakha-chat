"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import type { AdminLang } from "@/lib/admin/i18n";

const KEY = "abk_admin_lang";
const EVENT = "abk-admin-lang";

function read(): AdminLang {
  try {
    return localStorage.getItem(KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useAdminLang() {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as AdminLang);
  const setLang = useCallback((next: AdminLang) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [lang, setLang] as const;
}

export function LangToggle({ lang, setLang }: { lang: AdminLang; setLang: (l: AdminLang) => void }) {
  return (
    <div className="flex rounded-full border border-line/10 p-0.5 text-xs" role="group" aria-label="Language">
      {(["en", "ar"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-3 py-1.5 transition-colors ${lang === l ? "bg-brand text-white" : "text-secondary/70 hover:text-primary"}`}
        >
          {l === "en" ? "EN" : "عربي"}
        </button>
      ))}
    </div>
  );
}

// Light by default; each person's choice is remembered in their browser.
export type AdminTheme = "light" | "dark";
const THEME_KEY = "abk_admin_theme";
const THEME_EVENT = "abk-admin-theme";

function readTheme(): AdminTheme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribeTheme(cb: () => void) {
  window.addEventListener(THEME_EVENT, cb);
  return () => window.removeEventListener(THEME_EVENT, cb);
}

export function useAdminTheme() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "light" as AdminTheme);
  const toggle = useCallback(() => {
    try {
      localStorage.setItem(THEME_KEY, readTheme() === "dark" ? "light" : "dark");
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);
  return [theme, toggle] as const;
}

export const themeClass = (theme: AdminTheme) => (theme === "dark" ? "admin-dark" : "admin-light");

export function ThemeToggle({ theme, toggle, label }: { theme: AdminTheme; toggle: () => void; label: string }) {
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full border border-line/10 text-secondary/80 hover:border-line/25 hover:text-primary"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
