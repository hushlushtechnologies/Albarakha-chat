"use client";

import { useState, type FormEvent } from "react";
import { Turnstile, captchaEnabled } from "@/components/Turnstile";
import { getSessionId, readAttribution } from "@/lib/attribution";
import { countries, defaultPreferred, type ContactMethod, type Preferred, type TimeWindow } from "@/lib/contact";
import type { Lang, Strings } from "@/lib/i18n";

export type LeadResult = { whatsappUrl: string; firstName: string; eventId: string };
type Slot = { day: string; dayLabel: string; window: TimeWindow };

const PREFS: Preferred[] = ["whatsapp", "phone", "email"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm({
  method,
  slot,
  opportunityId,
  lang,
  t,
  done,
  onSubmitted,
}: {
  method: ContactMethod;
  slot?: Slot;
  opportunityId?: string | null;
  lang: Lang;
  t: Strings;
  done: boolean;
  onSubmitted: (result: LeadResult) => void;
}) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("971");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferred, setPreferred] = useState<Preferred>(defaultPreferred[method]);
  const [consent, setConsent] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = t.errName;
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 6 || digits.length > 12) e.phone = t.errPhone;
    if (email.trim() && !EMAIL_RE.test(email.trim())) e.email = t.errEmail;
    if (preferred === "email" && !email.trim()) e.email = t.errEmailNeeded;
    if (!consent) e.consent = t.errConsent;
    if (captchaEnabled && !captcha) e.captcha = t.errCaptcha;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (done || sending || !validate()) return;
    setSending(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: `+${country} ${phone.replace(/\D/g, "").replace(/^0+/, "")}`,
          email: email.trim() || undefined,
          preferred,
          method,
          slot: slot ? { day: slot.day, window: slot.window } : undefined,
          opportunityId: opportunityId ?? undefined,
          consent,
          captchaToken: captcha ?? undefined,
          // Spam check: time since the chat page opened. Real visitors always spend a
          // few seconds in the chat first; bots posting straight to the server don't.
          // (Replaces a hidden "trap" field, which browser autofill could fill by mistake.)
          elapsedMs: Math.round(performance.now()),
          language: lang,
          sessionId: getSessionId(),
          attribution: readAttribution(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ form: data.error === "rate_limited" ? t.rateLimited : data.error === "captcha" ? t.errCaptcha : t.errGeneric });
        return;
      }
      onSubmitted(data as LeadResult);
    } catch {
      setErrors({ form: t.errGeneric });
    } finally {
      setSending(false);
    }
  };

  const input =
    "mt-1 block w-full rounded-xl border bg-ink/60 px-3 py-2.5 text-base text-primary placeholder:text-muted focus:border-brand-light/70 focus:outline-none";
  const border = (key: string) => (errors[key] ? "border-red-400/70" : "border-brand-light/20");
  const err = (key: string) =>
    errors[key] && (
      <p className="mt-1 text-xs text-red-300" role="alert">
        {errors[key]}
      </p>
    );

  return (
    <form
      onSubmit={submit}
      noValidate
      className={`rounded-2xl border border-brand-light/15 bg-ink/50 p-4 ${done ? "pointer-events-none opacity-60" : ""}`}
    >
      <h3 className="text-lg font-semibold text-primary">{t.formTitle}</h3>
      <p className="mt-1 text-sm leading-relaxed text-secondary/75">{t.formSub}</p>

      <fieldset disabled={done || sending} className="mt-4 space-y-4">
        <label className="block text-sm text-secondary">
          {t.fullName}
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} className={`${input} ${border("name")}`} />
          {err("name")}
        </label>

        <div className="text-sm text-secondary">
          <span id="mobile-label">{t.mobile}</span>
          <div className="mt-1 flex gap-2" dir="ltr">
            <select
              aria-label="Country code"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="rounded-xl border border-brand-light/20 bg-ink/60 px-2 py-2.5 text-base text-primary focus:border-brand-light/70 focus:outline-none"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  +{c.code} {c.label}
                </option>
              ))}
            </select>
            <input
              aria-labelledby="mobile-label"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, "").slice(0, 16))}
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="50 123 4567"
              className={`${input} mt-0 min-w-0 flex-1 ${border("phone")}`}
            />
          </div>
          {err("phone")}
        </div>

        <label className="block text-sm text-secondary">
          {t.emailOptional}
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={160}
            className={`${input} ${border("email")}`}
          />
          {err("email")}
        </label>

        <div className="text-sm text-secondary">
          {t.preferred}
          <div className="mt-1.5 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.preferred}>
            {PREFS.map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={preferred === p}
                onClick={() => setPreferred(p)}
                className={`rounded-xl border px-2 py-2.5 text-sm transition-colors ${
                  preferred === p ? "border-brand-light bg-brand text-white" : "border-brand-light/20 text-secondary hover:border-brand-light/50"
                }`}
              >
                {t.prefOptions[p]}
              </button>
            ))}
          </div>
        </div>

        <label className="flex gap-3 text-sm leading-relaxed text-secondary/85">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 size-4 shrink-0 accent-[#33b082]"
          />
          <span>{t.consent}</span>
        </label>
        {err("consent")}

        <Turnstile lang={lang} onToken={setCaptcha} />
        {err("captcha")}
        {err("form")}

        <button type="submit" className="btn-primary w-full py-3 text-[15px]">
          {done ? t.submitted : sending ? t.submitting : t.submit}
        </button>
      </fieldset>
    </form>
  );
}
