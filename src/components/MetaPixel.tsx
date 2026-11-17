"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

// Loads the Meta Pixel only when NEXT_PUBLIC_META_PIXEL_ID is set.
// Never on the staff dashboard, so team visits don't count as ad traffic.
export function MetaPixel() {
  const pathname = usePathname();
  if (!PIXEL_ID || pathname?.startsWith("/admin")) return null;
  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

type Fbq = (
  action: string,
  event: string,
  params?: Record<string, unknown>,
  options?: { eventID: string },
) => void;

// eventId matches the server-side Conversions API event, so Meta counts it once.
export function trackPixel(event: string, params?: Record<string, unknown>, eventId?: string) {
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (!fbq) return;
  if (eventId) fbq("track", event, params ?? {}, { eventID: eventId });
  else fbq("track", event, params);
}
