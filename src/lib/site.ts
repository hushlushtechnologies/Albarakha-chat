// Company details shown in the UI and given to the AI.
// Taken from the live site (afaqalbarakha.com). Edit here, not in components.
export const site = {
  name: "Afaq Al Barakha Investment",
  shortName: "Albarakha Investment",
  locationLabel: "Dubai · UAE",
  // Give the assistant a name if the client wants one (e.g. "Layla").
  assistantName: "Al Barakha Assistant",
  assistantRole: "Investor Assistant",
  phoneDisplay: "+971 54 571 3199",
  phoneHref: "tel:+971545713199",
  email: "info@afaqalbarakha.com",
  address: "Office No. 501, Al Zarouni Business Center, Al Barsha 1, Sheikh Zayed Road, Dubai",
  website: "https://afaqalbarakha.com",
  // The main website, used for the Terms and Privacy links.
  mainSiteUrl: process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://al-barakha.vercel.app",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "971542440850",
} as const;

export const legalLinks = {
  terms: `${site.mainSiteUrl}/terms-and-conditions`,
  privacy: `${site.mainSiteUrl}/privacy-policy`,
  importantInfo: "/important-information",
} as const;
