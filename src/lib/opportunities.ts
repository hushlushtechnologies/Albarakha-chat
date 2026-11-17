import { isDev } from "./content";
import type { Lang } from "./i18n";

// The five opportunity types from the main website.
//
// `terms` = what the CLIENT has confirmed in writing. Leave a field null until
// they do: the card then shows "Shared in your consultation", and the returns
// calculator only appears once targetReturnPct is set.
//
// `demo` = sample numbers so the card can be previewed. They are ONLY used on
// localhost (and labelled "Demo data"). They never reach the live site or the AI.

type T = Record<Lang, string>;
export type Risk = "low" | "medium" | "high";

export type Terms = {
  risk: Risk | null;
  minimumAed: number | null;
  period: T | null;
  targetReturnPct: number | null; // yearly, e.g. 12 = up to 12% a year
  payouts: T | null;
  payoutOptions: ("monthly" | "quarterly" | "yearly")[];
};

export type Opportunity = {
  id: string;
  title: T;
  summary: T;
  tagline: T;
  overview: T;
  tone: "emerald" | "gold" | "teal" | "jade" | "olive";
  terms: Terms;
  demo: Terms;
};

const none: Terms = { risk: null, minimumAed: null, period: null, targetReturnPct: null, payouts: null, payoutOptions: [] };

export const opportunities: Opportunity[] = [
  {
    id: "real-estate",
    tone: "emerald",
    title: { en: "Real Estate Investment", ar: "الاستثمار العقاري" },
    summary: { en: "Prime real estate across the UAE", ar: "عقارات مميزة في أنحاء الإمارات" },
    tagline: { en: "Property in the UAE's sought-after locations.", ar: "عقارات في أكثر مواقع الإمارات طلباً." },
    overview: {
      en: "Access to prime real estate opportunities across the UAE, assessed by our advisors for location, demand and long-term value.",
      ar: "فرص عقارية مميزة في أنحاء الإمارات، يقيّمها مستشارونا من حيث الموقع والطلب والقيمة على المدى الطويل.",
    },
    terms: none,
    demo: {
      risk: "medium",
      minimumAed: 250000,
      period: { en: "3-year term", ar: "مدة 3 سنوات" },
      targetReturnPct: 10,
      payouts: { en: "Quarterly or yearly", ar: "ربع سنوي أو سنوي" },
      payoutOptions: ["quarterly", "yearly"],
    },
  },
  {
    id: "business",
    tone: "gold",
    title: { en: "Business Investment", ar: "الاستثمار في الأعمال" },
    summary: { en: "Established and emerging UAE businesses", ar: "شركات قائمة وناشئة في الإمارات" },
    tagline: { en: "Back real businesses in key UAE sectors.", ar: "استثمر في أعمال حقيقية في قطاعات رئيسية بالإمارات." },
    overview: {
      en: "Investment in established and emerging businesses across key sectors of the UAE economy, selected through our opportunity assessment process.",
      ar: "الاستثمار في شركات قائمة وناشئة عبر القطاعات الرئيسية في اقتصاد الإمارات، يتم اختيارها من خلال عملية تقييم الفرص لدينا.",
    },
    terms: none,
    demo: {
      risk: "medium",
      minimumAed: 100000,
      period: { en: "2-year term", ar: "مدة سنتين" },
      targetReturnPct: 12,
      payouts: { en: "Monthly, quarterly or yearly", ar: "شهري أو ربع سنوي أو سنوي" },
      payoutOptions: ["monthly", "quarterly", "yearly"],
    },
  },
  {
    id: "income",
    tone: "teal",
    title: { en: "Income-Generating Assets", ar: "الأصول المدرّة للدخل" },
    summary: { en: "Assets built around regular income", ar: "أصول مبنية على دخل منتظم" },
    tagline: { en: "Revenue-generating assets for steady income streams.", ar: "أصول مدرّة للإيرادات لتدفقات دخل منتظمة." },
    overview: {
      en: "Revenue-generating assets selected for their ability to produce reliable income streams over time.",
      ar: "أصول مدرّة للإيرادات يتم اختيارها لقدرتها على توفير تدفقات دخل موثوقة مع مرور الوقت.",
    },
    terms: none,
    demo: {
      risk: "low",
      minimumAed: 100000,
      period: { en: "2-year term", ar: "مدة سنتين" },
      targetReturnPct: 8,
      payouts: { en: "Monthly or quarterly", ar: "شهري أو ربع سنوي" },
      payoutOptions: ["monthly", "quarterly"],
    },
  },
  {
    id: "growth",
    tone: "jade",
    title: { en: "Growth Opportunities", ar: "فرص النمو" },
    summary: { en: "High-potential sectors and ventures", ar: "قطاعات ومشاريع عالية الإمكانات" },
    tagline: { en: "Positioned for long-term growth.", ar: "مهيّأة للنمو على المدى الطويل." },
    overview: {
      en: "Opportunities in high-potential sectors and ventures, for investors focused on long-term growth who are comfortable with higher risk.",
      ar: "فرص في قطاعات ومشاريع عالية الإمكانات، للمستثمرين الذين يركزون على النمو طويل الأجل ويتقبلون مخاطر أعلى.",
    },
    terms: none,
    demo: {
      risk: "high",
      minimumAed: 100000,
      period: { en: "3 to 5 years", ar: "من 3 إلى 5 سنوات" },
      targetReturnPct: 18,
      payouts: { en: "At the end of the term", ar: "في نهاية المدة" },
      payoutOptions: ["yearly"],
    },
  },
  {
    id: "structured",
    tone: "olive",
    title: { en: "Structured Investment", ar: "الاستثمار المهيكل" },
    summary: { en: "Tailored structures focused on stability", ar: "هياكل مصممة تركّز على الاستقرار" },
    tagline: { en: "Designed around stability and capital protection.", ar: "مصمم حول الاستقرار وحماية رأس المال." },
    overview: {
      en: "Tailored investment structures designed with a focus on stability and capital protection. Exact terms depend on the structure agreed with your advisor.",
      ar: "هياكل استثمارية مصممة خصيصاً مع التركيز على الاستقرار وحماية رأس المال. تعتمد الشروط الدقيقة على الهيكل المتفق عليه مع مستشارك.",
    },
    terms: none,
    demo: {
      risk: "low",
      minimumAed: 500000,
      period: { en: "2-year term", ar: "مدة سنتين" },
      targetReturnPct: 7,
      payouts: { en: "Quarterly", ar: "ربع سنوي" },
      payoutOptions: ["quarterly"],
    },
  },
];

export function getOpportunity(id: string | null | undefined) {
  return opportunities.find((o) => o.id === id);
}

// Confirmed terms, or the demo numbers on localhost only.
export function termsFor(o: Opportunity): { terms: Terms; isDemo: boolean } {
  const confirmed = Object.values(o.terms).some((v) => (Array.isArray(v) ? v.length > 0 : v !== null));
  if (confirmed || !isDev) return { terms: o.terms, isDemo: false };
  return { terms: o.demo, isDemo: true };
}
