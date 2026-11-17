import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { importantInfo } from "@/lib/importantInfo";
import { legalLinks, site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Important information | ${site.name}`,
};

// Same text as the modal, for anyone who opens the link directly.
export default function ImportantInformationPage() {
  const info = importantInfo.en;
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-secondary/80 hover:text-brand-light">
        <ArrowLeft className="size-4" aria-hidden /> Back to chat
      </Link>
      <h1 className="mt-8 text-3xl font-semibold text-primary">{info.title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-secondary/85">
        {info.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <p className="mt-10 flex gap-6 border-t border-brand-light/15 pt-6 text-sm text-secondary/80">
        <a href={legalLinks.terms} className="hover:text-brand-light">Terms &amp; Conditions</a>
        <a href={legalLinks.privacy} className="hover:text-brand-light">Privacy Policy</a>
      </p>
    </main>
  );
}
