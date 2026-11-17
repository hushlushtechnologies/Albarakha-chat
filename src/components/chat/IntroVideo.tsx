"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { IntroVideoConfig } from "@/lib/content";

// Intro video card. Shows a poster first and only loads the video on tap,
// so the page stays fast for ad traffic. Plays a local file or a YouTube video.
export function IntroVideo({ video, label }: { video: IntroVideoConfig; label: string }) {
  const [playing, setPlaying] = useState(false);
  const poster = video.youtubeId ? `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg` : video.poster;

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-brand-light/15 bg-ink shadow-[0_20px_50px_-25px_rgb(0_0_0_/_0.9)]">
      {playing ? (
        video.youtubeId ? (
          <iframe
            className="absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video className="absolute inset-0 size-full bg-ink" src={video.src} poster={video.poster} controls autoPlay playsInline />
        )
      ) : (
        <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 text-start" aria-label={`${label}: ${video.title}`}>
          {poster &&
            (video.youtubeId ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail
              <img src={poster} alt="" className="size-full object-cover" />
            ) : (
              <Image src={poster} alt="" fill sizes="440px" className="object-cover" />
            ))}
          <span className="absolute inset-0 bg-gradient-to-b from-ink/70 via-transparent to-ink/80" />
          <span className="absolute top-3 start-3 end-3 flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-gold/60 bg-gold-surface">
              <Image src="/logo-mark.svg" alt="" width={18} height={20} className="h-4 w-auto" />
            </span>
            <span className="truncate text-sm font-semibold text-primary">{video.title}</span>
          </span>
          <span className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold/70 bg-ink/70 text-gold backdrop-blur transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-0.5 size-6 fill-current" aria-hidden />
          </span>
          <span className="absolute end-3 bottom-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            {label}
          </span>
        </button>
      )}
    </div>
  );
}
