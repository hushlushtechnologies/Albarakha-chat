import { site } from "./site";

export type LeadSummary = {
  name: string;
  phone: string;
  interest?: string;
  investorType?: string;
  budget?: string;
  timeline?: string;
  meeting?: string; // e.g. "Video call · Sun 15 Nov, Afternoon"
};

// Builds a wa.me link with the lead's details typed in, so the
// sales team sees the context the moment the visitor taps send.
export function buildWhatsAppUrl(lead: LeadSummary): string {
  const lines = [
    `Hello, I'm ${lead.name}. I'd like to book an investment consultation.`,
    lead.interest && `Interested in: ${lead.interest}`,
    lead.investorType && `Investing as: ${lead.investorType}`,
    lead.budget && `Approx. amount: ${lead.budget}`,
    lead.timeline && `Timeline: ${lead.timeline}`,
    lead.meeting && `Requested: ${lead.meeting}`,
    `Phone: ${lead.phone}`,
  ].filter(Boolean);
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
}
