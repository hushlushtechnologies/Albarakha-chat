"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUp,
  Building2,
  CalendarCheck,
  Check,
  Info,
  Globe,
  History,
  LayoutGrid,
  Layers,
  MessageCircle,
  Mic,
  Phone,
  PhoneCall,
  Video,
  RotateCcw,
  ShieldCheck,
  Square,
  Target,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useDubaiDaypart, useLang } from "@/hooks/useLang";
import { ImportantInfoLink, type ImportantInfoHandle } from "@/components/ImportantInfo";
import { trackPixel } from "@/components/MetaPixel";
import { useSpeechInput, useSpeechOutput } from "@/hooks/useSpeech";
import { getSessionId, readAttribution } from "@/lib/attribution";
import { needsTime, type ContactMethod, type TimeWindow } from "@/lib/contact";
import { content } from "@/lib/content";
import { strings, type Lang } from "@/lib/i18n";
import { getOpportunity, opportunities } from "@/lib/opportunities";
import { parseReply, type ReplyAction, type ReplyOption } from "@/lib/replyOptions";
import { site } from "@/lib/site";
import { ContactForm, type LeadResult } from "./ContactForm";
import { IntroVideo } from "./IntroVideo";
import { LeadCard } from "./LeadCard";
import { MenuSheet, type SheetItem } from "./MenuSheet";
import { OPPORTUNITY_ICONS, OpportunityCard } from "./OpportunityCard";
import { OptionList, type Option } from "./OptionList";
import { RichText } from "./RichText";
import { TimePicker } from "./TimePicker";

const QUICK_ICONS = [Building2, Target, CalendarCheck, ShieldCheck];
const TYPING_MS = 850;
const LAST_KEY = "abk_last_opportunity";

type Props = { variant?: "page" | "embed" };
type LeadOutput = { saved: boolean; whatsappUrl?: string; firstName?: string; eventId?: string };

// Scripted chat items (menus, opportunity cards) shown between AI messages.
// `after` = how many AI-chat messages existed when the item was added.
type Item =
  | { id: string; after: number; kind: "user"; text: string }
  | { id: string; after: number; kind: "bot"; text: string }
  | { id: string; after: number; kind: "menu" }
  | { id: string; after: number; kind: "list" }
  | { id: string; after: number; kind: "card"; oppId: string }
  | { id: string; after: number; kind: "followup"; oppId: string }
  | { id: string; after: number; kind: "methods" }
  | { id: string; after: number; kind: "time"; method: ContactMethod }
  | { id: string; after: number; kind: "form"; method: ContactMethod; slot?: Slot }
  | { id: string; after: number; kind: "lead"; lead: LeadResult }
  | { id: string; after: number; kind: "wa" }
  | { id: string; after: number; kind: "feedback" };
type Rating = "yes" | "partly" | "no";
type Slot = { day: string; dayLabel: string; window: TimeWindow };

const METHOD_ICONS: Record<ContactMethod, typeof Phone> = {
  office: Building2,
  video: Video,
  scheduled: CalendarCheck,
  callnow: PhoneCall,
  whatsapp: MessageCircle,
};
const METHODS: ContactMethod[] = ["office", "video", "scheduled", "callnow", "whatsapp"];
type NewItem = Item extends infer I ? (I extends Item ? Omit<I, "id" | "after"> : never) : never;

// Last opportunity viewed on a previous visit, read once per page load.
let initialLast: string | null | undefined;
function readInitialLast() {
  if (initialLast === undefined) {
    try {
      initialLast = localStorage.getItem(LAST_KEY);
    } catch {
      initialLast = null;
    }
  }
  return initialLast;
}
const noopSubscribe = () => () => {};

// Reveals the opening messages one at a time, with typing in between.
function useIntroSequence(total: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers: number[] = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0;
    const step = () => {
      i = reduced ? total : i + 1;
      setShown(i);
      if (i < total) timers.push(window.setTimeout(step, TYPING_MS));
    };
    timers.push(window.setTimeout(step, reduced ? 0 : 450));
    return () => timers.forEach(clearTimeout);
  }, [total]);
  return shown;
}

export function ChatWindow({ variant = "page" }: Props) {
  const [lang, setLang] = useLang();
  const [input, setInput] = useState("");
  const [voiceOn, setVoiceOn] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [localTyping, setLocalTyping] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [submittedForms, setSubmittedForms] = useState<string[]>([]);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const infoRef = useRef<ImportantInfoHandle>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);
  const t = strings[lang];
  const daypart = useDubaiDaypart();
  const greeting =
    daypart === "morning" ? t.greetingMorning : daypart === "afternoon" ? t.greetingAfternoon : daypart ? t.greetingEvening : null;
  const isEmbed = variant === "embed";

  const lastOpp = getOpportunity(useSyncExternalStore(noopSubscribe, readInitialLast, () => null));

  const introSteps = useMemo(
    () =>
      [
        content.introVideo ? "video" : null,
        "greeting",
        lastOpp ? "welcomeBack" : "intro",
        lastOpp ? "lastViewed" : null,
        "menu",
      ].filter(Boolean) as string[],
    [lastOpp],
  );
  const introShown = useIntroSequence(introSteps.length);
  const introDone = introShown >= introSteps.length;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ sessionId: getSessionId(), attribution: readAttribution() }),
      }),
    [],
  );

  const { messages, sendMessage, status, error, regenerate } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";

  const speech = useSpeechOutput(lang);
  const transcriptRef = useRef("");
  const mic = useSpeechInput(lang, (text) => {
    transcriptRef.current = text;
    setInput(text);
  });

  // Capture attribution on first load, before UTM params can be lost.
  useEffect(() => {
    readAttribution();
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status, items, introShown, localTyping]);

  // Speak the assistant's reply once it finishes streaming.
  const prevStatus = useRef(status);
  useEffect(() => {
    const finished = prevStatus.current === "streaming" && status === "ready";
    prevStatus.current = status;
    if (!finished || !voiceOn) return;
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    const text = last?.parts.map((p) => (p.type === "text" ? parseReply(p.text).body : "")).join(" ").trim();
    if (text) speech.speak(text);
  }, [status, messages, voiceOn, speech]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    speech.cancel();
    sendMessage({ text: value }, { body: { language: lang, viewing, leadCaptured } });
    setInput("");
    transcriptRef.current = "";
    requestAnimationFrame(() => {
      if (inputRef.current) inputRef.current.style.height = "auto";
    });
  };

  // Adds scripted items: the first ones at once (e.g. the visitor's choice),
  // the rest one by one with the typing indicator, like a real reply.
  const play = useCallback(
    (now: NewItem[], later: NewItem[]) => {
      const after = messages.length;
      const stamp = (item: NewItem) => ({ ...item, id: crypto.randomUUID(), after }) as Item;
      setItems((prev) => [...prev, ...now.map(stamp)]);
      later.forEach((item, i) => {
        timers.current.push(
          window.setTimeout(() => {
            setLocalTyping(i < later.length - 1);
            setItems((prev) => [...prev, stamp(item)]);
          }, TYPING_MS * (i + 1)),
        );
      });
      if (later.length) setLocalTyping(true);
    },
    [messages.length],
  );

  const openList = (label: string) => play([{ kind: "user", text: label }], [{ kind: "bot", text: t.listIntro }, { kind: "list" }]);

  const openOpportunity = (oppId: string, label: string) => {
    const opp = getOpportunity(oppId);
    if (!opp) return;
    setViewing(oppId);
    try {
      localStorage.setItem(LAST_KEY, oppId);
    } catch {}
    trackPixel("ViewContent", { content_name: opp.title.en });
    play(
      [{ kind: "user", text: label }],
      [{ kind: "card", oppId }, { kind: "bot", text: t.followUp(opp.title[lang]) }, { kind: "followup", oppId }],
    );
  };

  const openMethods = (label: string) =>
    play([{ kind: "user", text: label }], [{ kind: "bot", text: t.howToSpeak }, { kind: "methods" }]);

  const chooseMethod = (method: ContactMethod) => {
    const label = t.methods[method].title;
    if (method === "whatsapp") {
      play([{ kind: "user", text: label }], [{ kind: "bot", text: t.waIntro }, { kind: "wa" }]);
    } else if (needsTime(method)) {
      play([{ kind: "user", text: label }], [{ kind: "bot", text: t.pickTimeIntro }, { kind: "time", method }]);
    } else {
      play([{ kind: "user", text: label }], [{ kind: "bot", text: t.detailsIntro }, { kind: "form", method }]);
    }
  };

  const pickTime = (method: ContactMethod, slot: Slot) =>
    play(
      [{ kind: "user", text: `${slot.dayLabel} · ${t.windows[slot.window]}` }],
      [{ kind: "bot", text: t.detailsIntro }, { kind: "form", method, slot }],
    );

  const onLead = (formId: string, lead: LeadResult) => {
    setSubmittedForms((prev) => [...prev, formId]);
    setLeadCaptured(true);
    if (lead.whatsappUrl) play([], [{ kind: "lead", lead }]);
  };

  const endChat = () =>
    play([{ kind: "user", text: t.endChat }], [{ kind: "bot", text: t.endAsk }, { kind: "feedback" }]);

  const giveFeedback = (rating: Rating) => {
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, sessionId: getSessionId(), language: lang }),
    }).catch(() => {});
    play(
      [{ kind: "user", text: t.feedback[rating] }],
      rating === "yes"
        ? [{ kind: "bot", text: t.endThanksYes }]
        : [{ kind: "bot", text: t.endThanksOther }, { kind: "methods" }],
    );
  };

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Send automatically when the visitor stops speaking.
  const wasListening = useRef(false);
  useEffect(() => {
    if (wasListening.current && !mic.listening && transcriptRef.current.trim()) send(transcriptRef.current);
    wasListening.current = mic.listening;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.listening]);

  const switchLang = () => {
    const next: Lang = lang === "en" ? "ar" : "en";
    setLang(next);
    speech.cancel();
  };

  const toggleVoice = () => {
    if (voiceOn) speech.cancel();
    setVoiceOn(!voiceOn);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const closeEmbed = () => window.parent?.postMessage({ type: "albarakha:close" }, "*");

  // Option sets
  const menuOptions = (withContinue: boolean): Option[] => [
    ...(withContinue && lastOpp
      ? [
          {
            key: "continue",
            icon: History,
            title: t.continueWith(lastOpp.title[lang]),
            hint: t.continueHint,
            onSelect: () => openOpportunity(lastOpp.id, t.continueWith(lastOpp.title[lang])),
          },
        ]
      : []),
    ...t.quick.map((q, i) => ({
      key: q.title,
      icon: QUICK_ICONS[i],
      title: q.title,
      hint: q.hint,
      onSelect: () => {
        const action = "action" in q ? q.action : null;
        if (action === "explore") openList(q.title);
        else if (action === "arrange") openMethods(q.title);
        else send(q.prompt);
      },
    })),
  ];

  const listOptions: Option[] = opportunities.map((o) => ({
    key: o.id,
    icon: OPPORTUNITY_ICONS[o.id] ?? Layers,
    title: o.title[lang],
    hint: o.summary[lang],
    onSelect: () => openOpportunity(o.id, o.title[lang]),
  }));

  // The opportunity is already known from `viewing`, so the options are the same for each card.
  const followUpOptions = (): Option[] => {
    return [
      { key: "arrange", icon: CalendarCheck, title: t.fuArrange, onSelect: () => openMethods(t.fuArrange) },
      { key: "others", icon: Building2, title: t.fuOthers, onSelect: () => openList(t.fuOthers) },
      {
        key: "notnow",
        title: t.fuNotNow,
        onSelect: () => play([{ kind: "user", text: t.fuNotNow }], [{ kind: "bot", text: t.notNowReply }, { kind: "menu" }]),
      },
    ];
  };

  const methodOptions: Option[] = METHODS.map((m) => ({
    key: m,
    icon: METHOD_ICONS[m],
    title: t.methods[m].title,
    hint: t.methods[m].hint,
    onSelect: () => chooseMethod(m),
  }));

  // Tap options under the latest AI reply (the AI's own, or defaults if it gave none).
  const runAction = (action: ReplyAction) => {
    const label = t.actionLabels[action];
    if (action === "consult") openMethods(label);
    else if (action === "explore") openList(label);
    else if (action === "whatsapp") chooseMethod("whatsapp");
    else play([{ kind: "user", text: label }], [{ kind: "menu" }]);
  };
  const lastMessage = messages.at(-1);
  const replyOptions: ReplyOption[] = (() => {
    if (!lastMessage || lastMessage.role !== "assistant") return [];
    const text = lastMessage.parts.map((p) => (p.type === "text" ? p.text : "")).join("\n");
    const parsed = parseReply(text).options;
    const base: ReplyOption[] = parsed.length
      ? parsed
      : [
          { kind: "action", action: leadCaptured ? "explore" : "consult" },
          { kind: "action", action: leadCaptured ? "whatsapp" : "explore" },
        ];
    return [...base.filter((o) => !(o.kind === "action" && o.action === "menu")), { kind: "action", action: "menu" }];
  })();
  const showReplyOptions =
    status === "ready" && !localTyping && replyOptions.length > 0 && !items.some((it) => it.after === messages.length);

  const sheetItems: SheetItem[] = [
    { key: "explore", icon: Building2, title: t.quick[0].title, onSelect: () => openList(t.quick[0].title) },
    { key: "goals", icon: Target, title: t.quick[1].title, onSelect: () => send(t.quick[1].prompt) },
    { key: "consult", icon: CalendarCheck, title: t.quick[2].title, onSelect: () => openMethods(t.quick[2].title) },
    { key: "callnow", icon: PhoneCall, title: t.methods.callnow.title, onSelect: () => chooseMethod("callnow") },
    { key: "about", icon: ShieldCheck, title: t.quick[3].title, onSelect: () => send(t.quick[3].prompt) },
    { key: "whatsapp", icon: MessageCircle, title: t.methods.whatsapp.title, onSelect: () => chooseMethod("whatsapp") },
    { key: "end", icon: Check, title: t.endChat, onSelect: endChat },
    { key: "info", icon: Info, title: t.importantInfo, onSelect: () => infoRef.current?.open() },
  ];

  const lastItem = items.at(-1);
  const isActive = (item: Item) => !busy && !localTyping && item === lastItem && item.after === messages.length;
  const introMenuActive = !busy && !localTyping && items.length === 0 && messages.length === 0;

  const renderItem = (item: Item) => {
    const active = isActive(item);
    switch (item.kind) {
      case "user":
        return (
          <Appear key={item.id}>
            <Bubble role="user">
              <p>{item.text}</p>
            </Bubble>
          </Appear>
        );
      case "bot":
        return (
          <Appear key={item.id}>
            <AssistantRow>
              <Bubble role="assistant">
                <p>{item.text}</p>
              </Bubble>
            </AssistantRow>
          </Appear>
        );
      case "menu":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <OptionList options={menuOptions(true)} disabled={!active} />
            </AssistantRow>
          </Appear>
        );
      case "list":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <OptionList options={listOptions} disabled={!active} />
            </AssistantRow>
          </Appear>
        );
      case "card": {
        const opp = getOpportunity(item.oppId);
        return opp ? (
          <Appear key={item.id}>
            <AssistantRow>
              <OpportunityCard opp={opp} lang={lang} t={t} />
            </AssistantRow>
          </Appear>
        ) : null;
      }
      case "methods":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <OptionList options={methodOptions} disabled={!active} />
            </AssistantRow>
          </Appear>
        );
      case "time":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <TimePicker lang={lang} t={t} disabled={!active} onPick={(slot) => pickTime(item.method, slot)} />
            </AssistantRow>
          </Appear>
        );
      case "form":
        return (
          <Appear key={item.id}>
            <AssistantRow>
              <ContactForm
                method={item.method}
                slot={item.slot}
                opportunityId={viewing}
                lang={lang}
                t={t}
                done={submittedForms.includes(item.id)}
                onSubmitted={(lead) => onLead(item.id, lead)}
              />
            </AssistantRow>
          </Appear>
        );
      case "lead":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <LeadCard whatsappUrl={item.lead.whatsappUrl} firstName={item.lead.firstName} eventId={item.lead.eventId} t={t} />
            </AssistantRow>
          </Appear>
        );
      case "wa":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <a
                href={`https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(t.waHello)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackPixel("Contact", { method: "whatsapp" })}
                className="btn-primary w-full px-5 py-3 text-sm"
              >
                <MessageCircle className="size-4" aria-hidden />
                {t.waOpen}
              </a>
            </AssistantRow>
          </Appear>
        );
      case "feedback":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <div className={`grid grid-cols-3 gap-2 ${active ? "" : "pointer-events-none opacity-45"}`}>
                {(["yes", "partly", "no"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={!active}
                    onClick={() => giveFeedback(r)}
                    className="rounded-xl border border-brand-light/25 bg-ink/40 py-2.5 text-sm font-medium text-primary transition-colors hover:border-brand-light hover:bg-brand/30"
                  >
                    {t.feedback[r]}
                  </button>
                ))}
              </div>
            </AssistantRow>
          </Appear>
        );
      case "followup":
        return (
          <Appear key={item.id}>
            <AssistantRow showAvatar={false}>
              <OptionList options={followUpOptions()} disabled={!active} />
              {active && (
                <button
                  type="button"
                  onClick={() => play([], [{ kind: "list" }])}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-secondary/20 px-3 py-1.5 text-xs text-secondary transition-colors hover:border-brand-light hover:text-brand-glow"
                >
                  <ArrowLeft className="size-3.5 rtl:rotate-180" aria-hidden /> {t.back}
                </button>
              )}
            </AssistantRow>
          </Appear>
        );
    }
  };

  const itemsAfter = (n: number) => items.filter((it) => it.after === n).map(renderItem);
  const iconBtn =
    "grid size-10 place-items-center rounded-full border border-secondary/20 text-secondary transition-colors hover:border-brand-light hover:text-brand-glow";
  const step = (name: string) => introSteps.indexOf(name) < introShown && introSteps.includes(name);

  return (
    <section
      dir={t.dir}
      lang={lang}
      aria-label={`Chat with ${site.assistantName}`}
      className={`relative flex h-full min-h-0 flex-col overflow-hidden bg-surface ${
        isEmbed ? "" : "rounded-[28px] border border-brand-light/15 shadow-[0_40px_120px_-40px_rgb(35_226_155_/_0.25)]"
      }`}
    >
      {/* Header */}
      <header className="relative flex items-center gap-3 bg-gradient-to-r from-brand-dark via-[#0a2219] to-brand-deep/70 px-4 py-3.5">
        <Avatar size="lg" online />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-primary">
            <span className="hidden min-[420px]:inline">{t.headerName}</span>
            <span className="min-[420px]:hidden">{t.headerNameShort}</span>
          </p>
          <p className="truncate text-xs text-secondary/70">
            {t.role} <span className="text-brand-light">· {t.online}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={switchLang}
          aria-label={t.langSwitchLabel}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-secondary/20 px-3 text-sm text-secondary transition-colors hover:border-brand-light hover:text-brand-glow"
        >
          <Globe className="size-3.5" aria-hidden />
          <span className="hidden min-[420px]:inline">{t.langSwitch}</span>
          <span className="min-[420px]:hidden">{lang === "en" ? "ع" : "EN"}</span>
        </button>
        <a href={site.phoneHref} aria-label={t.call} className={`${iconBtn} shrink-0`}>
          <Phone className="size-4" aria-hidden />
        </a>
        {isEmbed && (
          <button type="button" onClick={closeEmbed} aria-label={t.close} className={iconBtn}>
            <X className="size-4" aria-hidden />
          </button>
        )}
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scroll-thin flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
        aria-live="polite"
      >
        <p className="text-center text-xs text-muted">{t.today}</p>

        {step("video") && content.introVideo && (
          <Appear>
            <AssistantRow>
              <IntroVideo video={content.introVideo} label={t.video} />
            </AssistantRow>
          </Appear>
        )}

        {step("greeting") && (
          <Appear>
            <AssistantRow showAvatar={!content.introVideo}>
              <Bubble role="assistant">
                <p>
                  {greeting ? `${greeting}${lang === "ar" ? "، " : ", "}` : ""}
                  {t.welcome}
                </p>
              </Bubble>
            </AssistantRow>
          </Appear>
        )}

        {step("intro") && (
          <Appear>
            <AssistantRow showAvatar={false}>
              <Bubble role="assistant">
                <p>{t.intro}</p>
                <p className="mt-3">{t.noObligation}</p>
              </Bubble>
            </AssistantRow>
          </Appear>
        )}

        {step("welcomeBack") && (
          <Appear>
            <AssistantRow showAvatar={false}>
              <Bubble role="assistant">
                <p>{t.welcomeBack}</p>
              </Bubble>
            </AssistantRow>
          </Appear>
        )}

        {step("lastViewed") && lastOpp && (
          <Appear>
            <AssistantRow showAvatar={false}>
              <Bubble role="assistant">
                <p>{t.lastViewed(lastOpp.title[lang])}</p>
              </Bubble>
            </AssistantRow>
          </Appear>
        )}

        {step("menu") && (
          <Appear>
            <AssistantRow showAvatar={false}>
              <OptionList options={menuOptions(true)} disabled={!introMenuActive} />
            </AssistantRow>
          </Appear>
        )}

        {itemsAfter(0)}

        {messages.map((message, index) => (
          <div key={message.id} className="space-y-3">
            {message.parts.map((part, i) => {
              const key = `${message.id}-${i}`;
              if (part.type === "text" && part.text.trim()) {
                return message.role === "user" ? (
                  <Appear key={key}>
                    <Bubble role="user">
                      <p className="whitespace-pre-wrap">{part.text}</p>
                    </Bubble>
                  </Appear>
                ) : (
                  parseReply(part.text).body && (
                    <AssistantRow key={key}>
                      <Bubble role="assistant">
                        <RichText text={parseReply(part.text).body} />
                      </Bubble>
                    </AssistantRow>
                  )
                );
              }
              if (part.type === "tool-save_lead" && part.state === "output-available") {
                const output = part.output as LeadOutput;
                if (output.saved && output.whatsappUrl) {
                  return (
                    <AssistantRow key={key} showAvatar={false}>
                      <LeadCard whatsappUrl={output.whatsappUrl} firstName={output.firstName} eventId={output.eventId} t={t} />
                    </AssistantRow>
                  );
                }
              }
              return null;
            })}
            {itemsAfter(index + 1)}
          </div>
        ))}

        {showReplyOptions && (
          <Appear>
            <AssistantRow showAvatar={false}>
              <div className="flex flex-wrap gap-2">
                {replyOptions.map((o) => {
                  const label = o.kind === "action" ? t.actionLabels[o.action] : o.label;
                  const isMenu = o.kind === "action" && o.action === "menu";
                  return (
                    <button
                      key={`${o.kind}-${label}`}
                      type="button"
                      onClick={() => (o.kind === "action" ? runAction(o.action) : send(o.label))}
                      className={`rounded-full border px-3.5 py-2 text-sm transition-colors duration-300 ${
                        isMenu
                          ? "border-secondary/20 text-secondary/80 hover:border-brand-light hover:text-brand-glow"
                          : "border-brand-light/40 bg-brand/15 text-primary hover:border-brand-light hover:bg-brand/35"
                      }`}
                    >
                      {isMenu && <LayoutGrid className="me-1.5 inline size-3.5 -translate-y-px" aria-hidden />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </AssistantRow>
          </Appear>
        )}

        {(!introDone || localTyping || status === "submitted") && (
          <AssistantRow>
            <TypingIndicator label={t.typing} />
          </AssistantRow>
        )}

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            <span>{error.message.includes("rate_limited") ? t.rateLimited : t.error}</span>
            <button
              type="button"
              onClick={() => regenerate({ body: { language: lang, viewing, leadCaptured } })}
              className="inline-flex shrink-0 items-center gap-1.5 font-medium text-primary hover:text-brand-glow"
            >
              <RotateCcw className="size-3.5" aria-hidden /> {t.retry}
            </button>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={onSubmit} className="border-t border-brand-light/15 bg-brand-dark px-3 pt-3 pb-2.5">
        <div className="flex items-end gap-2 rounded-3xl border border-brand-light/20 bg-ink/60 py-1.5 ps-4 pe-1.5 transition-colors focus-within:border-brand-light/60">
          <label htmlFor="chat-input" className="sr-only">
            {t.placeholderNoMic}
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={1000}
            placeholder={mic.listening ? t.listening : mic.supported ? t.placeholder : t.placeholderNoMic}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={onKeyDown}
            className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] text-primary placeholder:text-muted focus:outline-none focus-visible:outline-none"
          />
          {input.trim() || !mic.supported ? (
            <button type="submit" disabled={busy || !input.trim()} aria-label={t.send} className="btn-primary size-10 shrink-0 p-0">
              <ArrowUp className="size-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={mic.listening ? mic.stop : mic.start}
              disabled={busy}
              aria-label={mic.listening ? t.micStop : t.micStart}
              className={`btn-primary size-10 shrink-0 p-0 ${mic.listening ? "animate-pulse" : ""}`}
            >
              {mic.listening ? <Square className="size-3.5 fill-current" aria-hidden /> : <Mic className="size-4" aria-hidden />}
            </button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setSheetOpen(true)}
            disabled={!introDone}
            aria-label={t.menu}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-secondary/15 text-secondary/80 transition-colors hover:text-brand-glow disabled:opacity-50"
          >
            <LayoutGrid className="size-4" aria-hidden />
          </button>
          {speech.supported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-pressed={voiceOn}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition-colors ${
                voiceOn ? "border-brand-light bg-brand/30 text-brand-glow" : "border-secondary/15 text-secondary/80 hover:text-brand-glow"
              }`}
            >
              {voiceOn ? <Volume2 className="size-3.5" aria-hidden /> : <VolumeX className="size-3.5" aria-hidden />}
              {t.voiceReplies}
            </button>
          )}
          <p className="min-w-0 basis-full text-center text-[10.5px] leading-snug text-muted sm:flex-1 sm:basis-0 sm:text-end">
            {content.showDisclaimers && <>{t.footer} </>}
            <ImportantInfoLink
              handle={infoRef}
              lang={lang}
              className="text-secondary/80 underline underline-offset-2 hover:text-brand-light"
            />
          </p>
        </div>
      </form>

      <MenuSheet open={sheetOpen} title={t.sheetTitle} closeLabel={t.sheetClose} items={sheetItems} onClose={closeSheet} />
    </section>
  );
}

// Fades each new message in, like it was just sent.
function Appear({ children }: { children: ReactNode }) {
  return <div className="animate-[msg-in_0.45s_var(--ease-premium)_both]">{children}</div>;
}

function Avatar({ size = "sm", online = false }: { size?: "sm" | "lg"; online?: boolean }) {
  const lg = size === "lg";
  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-full border border-gold/50 bg-gold-surface ${
        lg ? "size-11" : "size-7"
      }`}
    >
      <Image src="/logo-mark.svg" alt="" width={lg ? 30 : 18} height={lg ? 33 : 20} className={lg ? "h-7 w-auto" : "h-4 w-auto"} />
      {online && <span className="absolute -end-0.5 -bottom-0.5 size-3 rounded-full border-2 border-surface bg-brand-glow" />}
    </div>
  );
}

function AssistantRow({ children, showAvatar = true }: { children: ReactNode; showAvatar?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-7 shrink-0">{showAvatar && <Avatar />}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const user = role === "user";
  return (
    <div className={`flex ${user ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
          user
            ? "rounded-ee-md bg-brand text-white shadow-[inset_0_-4px_10px_0_#23e29b55]"
            : "surface-radial rounded-ss-md border border-brand-light/15 text-secondary"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex justify-start" role="status" aria-label={label}>
      <div className="surface-radial flex gap-1.5 rounded-2xl rounded-ss-md border border-brand-light/15 px-4 py-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-brand-light"
            style={{ animation: `typing-dot 1.2s ${i * 0.15}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
