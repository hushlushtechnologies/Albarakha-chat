// ─────────────────────────────────────────────────────────────
// Landing page + chat content.
//
// Anything set to `null` is a fact only the client can confirm
// (founding year, client count, AED invested, minimum investment,
// payout schedule, office hours...). While it's null:
//   • on localhost it shows as a dashed gold placeholder, so you can see the slot
//   • on the live site it is hidden completely
// Never fill these with guesses: they are claims to investors.
// ─────────────────────────────────────────────────────────────

export type Stat = { value: string | null; label: string };
export type TrustPoint = { text: string; confirmed: boolean };
export type IntroVideoConfig = { title: string; src?: string; poster?: string; youtubeId?: string | null };

export const content = {
  headline: {
    lead: "Build, protect and grow your wealth,",
    accent: "with guidance you can trust.",
  },

  // Shown under the headline. Mention the minimum once the client confirms it,
  // e.g. "Investment opportunities from AED 100,000, ..."
  subheadline:
    "Real estate, business and structured investment opportunities across the UAE, guided by advisors at our office in Al Barsha, Dubai.",
  minimumInvestment: null as string | null, // e.g. "AED 100,000"

  stats: [
    { value: null, label: "Established" }, // e.g. "2016"
    { value: null, label: "Clients advised" }, // e.g. "250+"
    { value: null, label: "AED managed" }, // e.g. "40M+"
  ] satisfies Stat[],

  trustPoints: [
    {
      text: "Office at Al Zarouni Business Center, Al Barsha 1, Sheikh Zayed Road, Dubai",
      confirmed: true,
    },
    {
      text: "Tailored guidance for individuals, families and businesses",
      confirmed: true,
    },
    {
      text: "A four-step process: understand, assess, strategize, monitor",
      confirmed: true,
    },
    // Client to confirm each of these before setting confirmed: true
    { text: "Every investment documented in a signed agreement before any funds move", confirmed: false },
    { text: "Regular performance statements and portfolio reviews", confirmed: false },
    { text: "Independent financial, tax and legal advice is always encouraged", confirmed: false },
  ] satisfies TrustPoint[],

  officeHours: null as string | null, // e.g. "Monday to Saturday, 10 AM – 6 PM"

  // Intro video shown first in the chat. Placeholder for now.
  // Real video later: set youtubeId (the part after v= in the link) and remove src/poster.
  introVideo: {
    title: "Afaq Al Barakha Investment | Introduction",
    src: "/intro-placeholder.mp4",
    poster: "/intro-placeholder.jpg",
    youtubeId: "ZXpW5Mt-TYM", // youtube.com/watch?v=ZXpW5Mt-TYM
  } as IntroVideoConfig | null,

  // Risk / "not investment advice" notes on the page, chat footer and cards.
  // Set false to hide them all.
  showDisclaimers: true,

  confidentialNote: "Confidential · your details are used only to arrange your consultation",

  disclaimer:
    "Information here is general and is not investment advice. Investments can go up or down in value, and you could lose money. Any investment is governed only by its signed agreement.",
};

export const isDev = process.env.NODE_ENV === "development";
