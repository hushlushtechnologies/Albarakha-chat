import type { Metadata, Viewport } from "next";
import { Pathway_Extreme } from "next/font/google";
import { MetaPixel } from "@/components/MetaPixel";
import "./globals.css";

const pathway = Pathway_Extreme({
  variable: "--font-pathway",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Afaq Al Barakha Investment | Investor Assistant",
  description:
    "Ask about our investment services and opportunities across the UAE, and book a private consultation with an advisor.",
  icons: { icon: "/logo-mark.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#010403",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pathway.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <MetaPixel />
      </body>
    </html>
  );
}
