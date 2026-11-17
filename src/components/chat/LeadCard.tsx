"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { trackPixel } from "@/components/MetaPixel";
import type { Strings } from "@/lib/i18n";

type Props = { whatsappUrl: string; firstName?: string; eventId?: string; t: Strings };

// Shown once a lead is saved: confirms, fires the Meta Lead event,
// and offers the WhatsApp handover with the details pre-filled.
export function LeadCard({ whatsappUrl, firstName, eventId, t }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackPixel("Lead", { content_name: "Investment consultation" }, eventId);
  }, [eventId]);

  return (
    <div className="surface-linear rounded-2xl border border-brand-light/30 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-glow" aria-hidden />
        <div>
          <p className="font-semibold text-primary">{t.leadTitle(firstName)}</p>
          <p className="mt-1 text-sm text-secondary/80">{t.leadBody}</p>
        </div>
      </div>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary mt-4 w-full px-5 py-3 text-sm"
        onClick={() => trackPixel("Contact", { method: "whatsapp" })}
      >
        <MessageCircle className="size-4" aria-hidden />
        {t.leadButton}
      </a>
    </div>
  );
}
