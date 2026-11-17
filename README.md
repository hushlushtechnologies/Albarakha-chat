# Albarakha Chat

AI lead-capture chatbot and sales dashboard for **Afaq Al Barakha Investment** (Dubai).

```
Meta / Instagram ad ──► Chat page (/)  ─┐
Main website bubble ──► Chat (/embed) ──┼─► AI qualifies the visitor ─► Lead saved (Supabase)
                                        │                                   │
                                        │                                   ├─► WhatsApp handover (+971 54 244 0850)
                                        │                                   ├─► Meta Lead event (Pixel + Conversions API)
                                        └──────────────────────────────────►└─► Sales dashboard (/admin)
```

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Run locally](#run-locally-windows--powershell)
4. [Environment variables](#environment-variables)
5. [Supabase setup](#supabase-setup)
6. [Pages and API routes](#pages-and-api-routes)
7. [Project structure](#project-structure)
8. [Editing content and the AI](#editing-content-and-the-ai)
9. [Sales dashboard (/admin)](#sales-dashboard-admin)
10. [Meta Pixel and Conversions API](#meta-pixel-and-conversions-api)
11. [Voice replies (ElevenLabs)](#voice-replies-elevenlabs)
12. [Security and abuse protection](#security-and-abuse-protection)
13. [Deploy to Vercel](#deploy-to-vercel)
14. [Add the chat bubble to the main website](#add-the-chat-bubble-to-the-main-website)
15. [Go-live checklist](#go-live-checklist)
16. [Troubleshooting](#troubleshooting)
17. [Roadmap](#roadmap)

---

## Features

**Visitor chat**
- Messages arrive one by one, with a typing indicator, an intro video and a welcome-back message for returning visitors.
- AI answers trained on the company's services, website content and FAQ. It always offers tap-to-answer buttons.
- Investment opportunity cards with a simple calculator and WhatsApp breakdown.
- Contact choices: office meeting, video call, scheduled call, call now or WhatsApp. These lead to a time picker, then a contact form with consent.
- English and Arabic (right-to-left), voice input (mic) and optional voice replies.
- Bottom menu sheet with important information, start again, and end chat with feedback.
- Important information and risk disclosure, shown as a pop-up and as its own page.

**Lead handling**
- Leads are saved from both the contact form and the AI (the `save_lead` tool).
- UTM, fbclid and source tracking, and a WhatsApp link pre-filled with the lead's details.
- A Meta `Lead` event is sent from the browser and from the server, de-duplicated with one shared event ID.

**Sales dashboard (`/admin`)**
- Staff login, lead stats, search and filters, one-tap Call and WhatsApp, and a status pipeline.
- Team notes, change history, Excel (CSV) export, auto refresh with new-lead alerts.
- English and Arabic, light mode by default with a dark mode switch, works on mobile.

---

## Tech stack

| Area | Used |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, lucide-react icons, motion |
| AI | Vercel AI SDK v7 – Google Gemini (testing) or OpenAI (production) |
| Database | Supabase (Postgres), server-side only |
| Validation | zod |
| Tracking | Meta Pixel + Meta Conversions API |
| Captcha (optional) | Cloudflare Turnstile |
| Voice (optional) | ElevenLabs text-to-speech, with the browser voice as fallback |
| Hosting | Vercel |

---

## Run locally (Windows / PowerShell)

Requires Node.js 20 or newer.

```powershell
npm install
copy .env.example .env.local   # then fill in the values
npm run dev
```

| URL | What it is |
|---|---|
| http://localhost:3000 | Full chat page (send Meta ad traffic here) |
| http://localhost:3000/embed | Compact chat used by the website bubble |
| http://localhost:3000/important-information | AI and investment risk disclosure |
| http://localhost:3000/admin | Sales team dashboard |

Other commands: `npm run build`, `npm run start` (production build) and `npm run lint`.

> Restart `npm run dev` after any change to `.env.local`.

**On localhost only:** sample opportunity terms and dashed "pending" boxes are shown, so you can see the layout. They are hidden on the live site until the client confirms the real values.

---

## Environment variables

Put these in `.env.local` locally, and in Vercel → Project → Settings → Environment Variables in production.
**Never commit `.env.local`.** It is already in `.gitignore`.

| Variable | Required | Notes |
|---|---|---|
| `AI_PROVIDER` | yes | `gemini` (free testing) or `openai` (production) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | if Gemini | From Google AI Studio |
| `GEMINI_MODEL` | no | Default `gemini-3.8-flash` |
| `OPENAI_API_KEY` | if OpenAI | From platform.openai.com |
| `OPENAI_MODEL` | no | Default `gpt-5.4-mini` |
| `SUPABASE_URL` | yes | Supabase → Settings → API |
| `SUPABASE_SECRET_KEY` | yes | Supabase → Settings → API Keys → **Secret key** (`sb_secret_…`). Server only, never put it in a `NEXT_PUBLIC_` variable |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | yes | Digits only, e.g. `971542440850` |
| `NEXT_PUBLIC_MAIN_SITE_URL` | yes | Main website, used for the Terms and Privacy links |
| `NEXT_PUBLIC_META_PIXEL_ID` | no | Turns on the Meta Pixel |
| `META_CAPI_ACCESS_TOKEN` | no | Turns on the server-side Conversions API |
| `META_TEST_EVENT_CODE` | no | Only while testing in Events Manager. Remove it when live |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | no | Captcha on the contact form |
| `ELEVENLABS_API_KEY` | no | Empty = free browser voice |
| `ELEVENLABS_VOICE_ID` / `ELEVENLABS_VOICE_ID_AR` | no | Default voice is the premade "Sarah" (`EXAVITQu4vr4xnSDxMaL`) |
| `ADMIN_USERS` | for /admin | `Name:password,Name2:password2` (each password 8+ characters) |
| `ADMIN_SESSION_SECRET` | for /admin | 32+ random characters (`openssl rand -hex 32`) |
| `RATE_LIMIT_PER_10_MIN` | no | Default 20 messages per visitor per 10 minutes |
| `RATE_LIMIT_PER_DAY` | no | Default 80 messages per visitor per day |
| `DAILY_MESSAGE_CAP` | no | Default 3000 messages per day for the whole site (cost safety) |

---

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** and run all of `supabase/schema.sql`.
   The script is safe to run again, so re-run it after every update to this file.
3. Copy the project URL and the **Secret key** into the environment variables.

Tables:

| Table | Purpose |
|---|---|
| `leads` | Every lead: contact details, interest, contact method, preferred time, consent, language, UTM/source, plus the dashboard fields (`status`, `staff_notes`, `updated_by`, `contacted_at`, `phone_digits`) |
| `lead_activity` | Dashboard history: who changed a status or the notes, and when |
| `messages` | Chat transcript per session (`session_id`, `role`, `content`) |
| `chat_feedback` | End-of-chat rating (yes / partly / no) |
| `chat_requests` + `check_chat_rate_limit()` | Rate limiting |

Row Level Security is **on with no policies**. This means only the server, using the secret key, can read or write. The browser never talks to Supabase directly.

Lead statuses: `new` → `contacted` → `meeting` → `won` / `lost`.

---

## Pages and API routes

| Route | Purpose |
|---|---|
| `/` | Full chat page with the brand panel |
| `/embed` | Chat only, loaded inside the website bubble's iframe |
| `/important-information` | Disclosure page |
| `/admin` | Sales dashboard (login required) |
| `POST /api/chat` | AI chat (streaming). Saves messages and can save a lead with the `save_lead` tool |
| `POST /api/lead` | Contact form submit → saves the lead, sends the Meta event, returns the WhatsApp link |
| `POST /api/feedback` | End-of-chat rating |
| `POST /api/tts` | Voice reply audio (ElevenLabs) |
| `POST /api/admin/login` · `/logout` | Staff session |
| `GET /api/admin/leads` | Lead list, filters and stats |
| `GET` / `PATCH /api/admin/leads/[id]` | One lead and its history / update status or notes |
| `GET /api/admin/export` | CSV download of the current filter |

---

## Project structure

```
supabase/schema.sql            Database tables, indexes, rate-limit function
public/widget.js               Chat bubble script for the main website
public/intro-placeholder.*     Placeholder intro video and poster (replace with the real video)

src/app/
  page.tsx                     Landing page (brand panel + chat)
  embed/page.tsx               Chat for the website bubble
  important-information/       Disclosure page
  admin/page.tsx               Dashboard (shows login or dashboard)
  api/…                        API routes (see table above)

src/components/
  chat/ChatWindow.tsx          Main chat: intro sequence, menus, flows, AI messages, option buttons
  chat/ContactForm.tsx         Name, phone, email, preferred contact, consent, captcha
  chat/OpportunityCard.tsx     Opportunity card + calculator
  chat/TimePicker.tsx · OptionList.tsx · MenuSheet.tsx · IntroVideo.tsx · LeadCard.tsx · RichText.tsx
  admin/…                      Dashboard UI (login, list, lead panel, coming soon)
  ImportantInfo.tsx · MetaPixel.tsx · Turnstile.tsx

src/lib/
  site.ts                      Company name, phone, email, address, WhatsApp
  content.ts                   Headline, stats, trust points, hours, intro video, disclaimers on/off
  knowledge.ts                 AI system prompt: company facts, tone, rules
  opportunities.ts             The 5 opportunity cards (EN/AR) and their terms
  i18n.ts                      All chat text in English and Arabic
  importantInfo.ts             Disclosure text (EN/AR)
  contact.ts                   Contact methods, country codes, days
  ai.ts                        Chooses Gemini or OpenAI
  supabase.ts                  Server-only Supabase client
  rateLimit.ts · request.ts    Abuse limits, IP hashing
  metaCapi.ts · attribution.ts Meta Conversions API, UTM/fbclid capture
  whatsapp.ts · replyOptions.ts WhatsApp link builder, AI option buttons parser
  admin/                       Dashboard auth, queries, shared types, EN/AR text

src/hooks/                     useLang (language), useSpeech (mic + voice)
```

---

## Editing content and the AI

| To change… | Edit |
|---|---|
| Company phone, email, address, WhatsApp | `src/lib/site.ts` |
| Headline, stats, trust points, office hours, intro video | `src/lib/content.ts` (`null` = not confirmed by the client yet, so hidden live) |
| Disclaimers on or off | `showDisclaimers` in `src/lib/content.ts` |
| What the AI knows or must never say | `src/lib/knowledge.ts` |
| Opportunity cards and their terms | `src/lib/opportunities.ts` (fill `terms` only with figures the client confirms) |
| Chat text and buttons, English and Arabic | `src/lib/i18n.ts` |
| Disclosure text | `src/lib/importantInfo.ts` |
| Dashboard text | `src/lib/admin/i18n.ts` |
| Intro video | Replace `public/intro-placeholder.mp4` / `.jpg`, or set `youtubeId` in `content.ts` |

**AI option buttons:** the AI ends each reply with a hidden line like
`[[options: Real estate | Business investment | {consult}]]`.
The chat hides that line and shows the options as buttons. `{consult}`, `{explore}` and `{whatsapp}` are action buttons.

**Facts rule:** the AI may only state figures written in `knowledge.ts`, `content.ts` or the confirmed `terms` in `opportunities.ts`. The sample charts on the main website's homepage (+12.4%, AED 2.85M, +8.2%) are illustrations, and the AI is told not to quote them.

**Switch to OpenAI:** set `AI_PROVIDER=openai` and `OPENAI_API_KEY`, then restart or redeploy. No code changes are needed.

---

## Sales dashboard (/admin)

1. Set `ADMIN_USERS` and `ADMIN_SESSION_SECRET`, then restart or redeploy.
2. Open `/admin` and sign in with a name and password from `ADMIN_USERS`. The name isn't case-sensitive.

- **To add a person,** add `Name:password` to `ADMIN_USERS`.
- **To remove access,** delete them or change their password. Their session stops working right away.
- Sessions last 7 days, in an HttpOnly cookie.
- After 8 wrong passwords from the same connection, login is blocked for 15 minutes.
- **WhatsApp button:** opens a chat with a greeting that includes the staff member's name. UAE numbers written locally (`05x…`) are turned into `+971` automatically.
- **Excel download:** gives a CSV of whatever filter is showing. It opens in Excel with Arabic names shown correctly.
- **Auto refresh:** the list checks for new leads every minute. New ones get a gold dot, and the count shows in the browser tab title.
- **Mode switch:** light mode by default. The moon or sun button switches modes, and each person's choice is remembered in their browser.
- The Meta Pixel never loads on `/admin`.

---

## Meta Pixel and Conversions API

- **Browser:** `PageView`, `ViewContent` (opportunity opened) and `Lead` (form submitted or AI saved a lead).
- **Server:** the same `Lead` is sent to the Conversions API with the same `event_id`, so Meta counts it once. Phone, first name, last name and visitor ID are SHA-256 hashed before sending. `fbc` and `fbp` are passed through.
- **To test:** set `META_TEST_EVENT_CODE`, submit a lead, and check Events Manager → Test events. Remove the code when you go live.
- **Ad links:** use UTM tags such as `?utm_source=facebook&utm_campaign=…&utm_content=…`. They show on the dashboard and in the export.

---

## Voice replies (ElevenLabs)

- The visitor turns on "Voice replies" in the chat.
- The server calls ElevenLabs (model `eleven_flash_v2_5`, 8-second timeout, max 600 characters).
- If there's no key, an error, or no credits left, the chat uses the free browser voice for the rest of the visit.
- The API key needs the **Text to Speech** permission.
- Free ElevenLabs accounts can't use library voices through the API. Use a premade voice such as Sarah.
- The free plan has no commercial licence. Move to Starter or higher before going live.

---

## Security and abuse protection

- Supabase secret key stays on the server only (`server-only` package). RLS has no public policies.
- **Rate limits** per hashed IP and a daily cap for the whole site cover chat, lead and voice requests. When a limit is hit, the visitor gets a friendly message with the WhatsApp link.
- **Bot check on the form:** a submit less than 3 seconds after the page loaded is treated as a bot. Nothing is saved and a WhatsApp link is shown instead.
- Optional Cloudflare Turnstile captcha.
- All input is validated with zod. The dashboard search is sanitised before it reaches the database.
- Dashboard sessions are HMAC-signed and HttpOnly, with `SameSite=Strict` and `Secure` in production.
- The Excel export protects against formula injection.
- All pages are set to `noindex`.

---

## Deploy to Vercel

1. Push the project to a **private** GitHub repo:
   ```powershell
   git init
   git add .
   git commit -m "Albarakha chat"
   git branch -M main
   git remote add origin https://github.com/<you>/albarakha-chat.git
   git push -u origin main
   ```
2. Go to vercel.com → **Add New → Project**, import the repo and keep the defaults.
3. Add all the environment variables (see the table above), then deploy.
4. Optional: add a custom domain, e.g. `chat.afaqalbarakha.com`.
5. Test `/`, submit a test lead, and check it appears on `/admin` and in Supabase.

Plans:
- **Vercel:** Hobby (free) is for personal, non-commercial projects. A client's live site needs **Pro**.
- **Gemini free tier:** for testing only. Google may use free-tier data to improve its products, and there are request limits.
- **Supabase free:** projects pause after about a week with no activity.

`NEXT_PUBLIC_*` variables are built into the site when it's deployed, so redeploy after changing one.

---

## Add the chat bubble to the main website

Add this before `</body>` on the main site (use your deployed domain):

```html
<script src="https://chat.afaqalbarakha.com/widget.js" defer></script>
```

In Next.js, add `<Script src="…/widget.js" strategy="lazyOnload" />` to the root layout.

- Open the chat from any button with `window.AlbarakhaChat?.open()`.
- Open it automatically after 8 seconds, once per visit, with `data-open-delay="8000"`.
- The bubble passes on the page URL and any UTM or fbclid tags, so the lead's source shows as "Website".

---

## Go-live checklist

- [ ] Client confirms: stats, minimum investment, office hours, opportunity terms, office address, intro video
- [ ] Arabic text checked by a native speaker
- [ ] Client's compliance team approves the AI wording and disclaimers
- [ ] `AI_PROVIDER=openai` (or paid Gemini) with billing on
- [ ] ElevenLabs paid plan, or remove the key to use the browser voice
- [ ] Supabase: `schema.sql` run on the live project
- [ ] Staff logins created in `ADMIN_USERS`, and a new `ADMIN_SESSION_SECRET` for production
- [ ] Meta Pixel ID + Conversions API token set, and the test event code removed
- [ ] Turnstile keys set
- [ ] Vercel Pro, custom domain, all environment variables
- [ ] `widget.js` added to the main website
- [ ] End-to-end test with a small Meta ad on a real phone (inside Instagram's own browser too)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "The dashboard isn't set up yet" on `/admin` | `ADMIN_USERS` is empty or every password is under 8 characters, or `ADMIN_SESSION_SECRET` is under 32 characters. Fix it, then restart |
| "Sorry, we couldn't send your details" | Re-run `supabase/schema.sql`, and check `SUPABASE_URL` and `SUPABASE_SECRET_KEY` |
| Dashboard says Supabase isn't connected | Same as above |
| AI doesn't reply | Check the AI key and `AI_PROVIDER`, and look at the terminal or Vercel logs |
| "Too many messages" in the chat | A rate limit was reached. Wait, or raise the limits in the environment variables |
| Voice uses the robotic browser voice | Open the browser Network tab and look at `/api/tts`: 404 means no key, 502 means an ElevenLabs error (check the server log). Most common causes are a missing Text to Speech permission, a library voice on a free plan, or no credits left |
| Mic button missing | The browser doesn't support speech input, or the page isn't on https |
| Supabase "service_role key not found" | Supabase now calls it the **Secret key**. Use `SUPABASE_SECRET_KEY` |

---

## Roadmap

Planned, shown as **Coming soon** on the dashboard:

- Chat transcripts in the lead panel (data is already saved in `messages`)
- Instant new-lead alerts by email or WhatsApp
- Assigning leads to staff, and follow-up reminders
- Live chat takeover by a team member
- Ad and conversion reports
- Visitor feedback insights
- **Instagram DM AI:** the same AI replying in Instagram DMs (Instagram Messaging API, webhooks)
- **WhatsApp AI:** WhatsApp Business Cloud API (paid per message)
