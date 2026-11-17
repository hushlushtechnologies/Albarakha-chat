# Albarakha Chat

AI chatbot for Afaq Al Barakha Investment. Visitors from Meta ads or the website chat with the assistant, leave their details, and get handed over to WhatsApp. The sales team sees all leads at `/admin`.

Built with Next.js, Supabase and the Vercel AI SDK (Gemini for testing, OpenAI for live).

## Getting started

```
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the keys. Then run `supabase/schema.sql` in the Supabase SQL Editor (it's safe to run again after updates).

- `/` – chat page
- `/embed` – chat used by the website bubble
- `/admin` – leads dashboard

## Environment variables

The main ones:

- `AI_PROVIDER` – `gemini` or `openai`, plus the matching API key
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER` – e.g. `971542440850`
- `ADMIN_USERS` – staff logins, `Name:password,Name2:password2`
- `ADMIN_SESSION_SECRET` – any random string, 32+ characters

The Meta Pixel, Turnstile and ElevenLabs keys are optional. See `.env.example` for the full list.

## Where to change things

- Company details – `src/lib/site.ts`
- Page content and intro video – `src/lib/content.ts`
- What the AI knows – `src/lib/knowledge.ts`
- Chat text (English/Arabic) – `src/lib/i18n.ts`
- Investment opportunities – `src/lib/opportunities.ts`

## Website bubble

Add this to the main site before `</body>`:

```html
<script src="https://chat.afaqalbarakha.com/widget.js" defer></script>
```

## Deploy

Push to GitHub. Vercel deploys automatically. Add the same environment variables in Vercel, and redeploy after changing any of them.
