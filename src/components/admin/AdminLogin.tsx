"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import { adminStrings } from "@/lib/admin/i18n";
import { LangToggle, ThemeToggle, themeClass, useAdminLang, useAdminTheme } from "./useAdminLang";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [lang, setLang] = useAdminLang();
  const [theme, toggleTheme] = useAdminTheme();
  const t = adminStrings[lang];
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(configured ? null : t.loginNotConfigured);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), password: form.get("password") }),
      });
      if (res.ok) {
        router.refresh();
        return;
      }
      const { error: code } = await res.json().catch(() => ({ error: "" }));
      setError(
        code === "too_many" ? t.loginTooMany : code === "not_configured" ? t.loginNotConfigured : res.status === 401 ? t.loginInvalid : t.loginError,
      );
    } catch {
      setError(t.loginError);
    }
    setBusy(false);
  }

  return (
    <main dir={t.dir} lang={lang} className={`${themeClass(theme)} grid min-h-dvh place-items-center bg-ink px-4 py-10 text-primary`}>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-gold/40 bg-gold-surface">
              <Image src="/logo-mark.svg" alt="" width={28} height={30} className="h-7 w-auto" priority />
            </div>
            <p className="font-semibold text-primary">Albarakha Investment</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} toggle={toggleTheme} label={theme === "dark" ? t.toLight : t.toDark} />
            <LangToggle lang={lang} setLang={setLang} />
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-line/10 bg-surface p-6 sm:p-8">
          <div className="mb-6 grid size-11 place-items-center rounded-full bg-brand-light/15 text-brand-light">
            <LockKeyhole className="size-5" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-primary">{t.loginTitle}</h1>
          <p className="mt-2 text-sm text-secondary/70">{t.loginHint}</p>

          <label className="mt-6 block text-sm text-secondary" htmlFor="admin-name">{t.name}</label>
          <input
            id="admin-name"
            name="name"
            autoComplete="username"
            required
            disabled={!configured}
            className="mt-2 w-full rounded-xl border border-line/10 bg-ink px-4 py-3 text-primary outline-none focus:border-brand-light"
          />
          <label className="mt-4 block text-sm text-secondary" htmlFor="admin-password">{t.password}</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={!configured}
            className="mt-2 w-full rounded-xl border border-line/10 bg-ink px-4 py-3 text-primary outline-none focus:border-brand-light"
          />

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy || !configured} className="btn-primary mt-6 w-full py-3">
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {busy ? t.signingIn : t.signIn}
          </button>
        </form>
      </div>
    </main>
  );
}
