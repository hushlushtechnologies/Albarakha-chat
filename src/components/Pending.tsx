import type { ReactNode } from "react";
import { isDev } from "@/lib/content";

// Wraps content the client hasn't confirmed yet.
// localhost: dashed gold outline + "client to confirm" tag. Live site: renders nothing.
export function Pending({ children, note = "Client to confirm" }: { children: ReactNode; note?: string }) {
  if (!isDev) return null;
  return (
    <span className="relative inline-block w-full rounded-lg border border-dashed border-gold/70 bg-gold/5 p-1">
      <span className="absolute -top-2.5 right-2 rounded-full bg-gold px-2 text-[10px] font-semibold tracking-wide text-ink uppercase">
        {note}
      </span>
      {children}
    </span>
  );
}
