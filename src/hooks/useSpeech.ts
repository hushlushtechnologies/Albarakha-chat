"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/i18n";

// Browser-native speech: microphone input (Web Speech API) and spoken replies
// (speechSynthesis). Free, no API key. Mic works in Chrome, Edge and Safari;
// where it isn't supported the mic button simply doesn't show.

type RecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => Recognition;

const LOCALE: Record<Lang, string> = { en: "en-US", ar: "ar-AE" };

const noopSubscribe = () => () => {};
// true in the browser when the feature exists, false during server render
function useBrowserSupport(check: () => boolean) {
  return useSyncExternalStore(noopSubscribe, check, () => false);
}

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechInput(lang: Lang, onText: (text: string) => void) {
  const supported = useBrowserSupport(() => Boolean(getRecognition()));
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = LOCALE[lang];
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      onTextRef.current(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, [lang]);

  useEffect(() => () => recRef.current?.stop(), []);

  return { supported, listening, start, stop };
}

function toSpeakable(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
}

// Spoken replies: ElevenLabs (via /api/tts) when the server has a key,
// otherwise, or if it fails or runs out of credits, the browser's built-in voice.
let remoteVoiceOff = false;

export function useSpeechOutput(lang: Lang) {
  const browserVoice = useBrowserSupport(() => "speechSynthesis" in window);
  const supported = useBrowserSupport(() => typeof Audio !== "undefined" || "speechSynthesis" in window);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speakInBrowser = useCallback(
    (text: string) => {
      if (!browserVoice) return;
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LOCALE[lang];
      const voice =
        synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang) && /female|natural|google/i.test(v.name)) ??
        synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      synth.speak(utterance);
    },
    [lang, browserVoice],
  );

  const speak = useCallback(
    async (raw: string) => {
      cancel();
      const text = toSpeakable(raw);
      if (!text) return;
      if (!remoteVoiceOff) {
        const controller = new AbortController();
        requestRef.current = controller;
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, lang }),
            signal: controller.signal,
          });
          // No key, out of credits, voice not allowed...: use the browser voice for the
          // rest of this visit instead of waiting on a failing request every reply.
          if (!res.ok && res.status !== 429) remoteVoiceOff = true;
          if (res.ok) {
            const audio = new Audio(URL.createObjectURL(await res.blob()));
            if (controller.signal.aborted) return;
            audioRef.current = audio;
            await audio.play();
            return;
          }
        } catch (err) {
          if (controller.signal.aborted) return; // cancelled by a new message or the toggle
          if (err instanceof Error && err.name === "NotAllowedError") return;
        }
      }
      speakInBrowser(text);
    },
    [cancel, lang, speakInBrowser],
  );

  useEffect(() => cancel, [cancel]);

  return { supported, speak, cancel };
}
