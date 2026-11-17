import { digitsOnly } from "@/lib/admin/shared";

// International number for tel:/wa.me. Local UAE numbers (05x...) get +971.
export function intlDigits(phone: string | null): string | null {
  if (!phone) return null;
  let d = digitsOnly(phone);
  if (d.startsWith("00")) d = d.slice(2);
  else if (/^05\d{8}$/.test(d)) d = `971${d.slice(1)}`;
  return d.length >= 7 ? d : null;
}

export const telHref = (phone: string | null) => {
  const d = intlDigits(phone);
  return d ? `tel:+${d}` : null;
};

export const waHref = (phone: string | null, text: string) => {
  const d = intlDigits(phone);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null;
};
