import "server-only";
import { createHash } from "node:crypto";

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// Visitor details from the incoming request (Vercel sets x-real-ip / x-forwarded-for).
export function requestInfo(req: Request) {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined;
  const cookies = Object.fromEntries(
    (req.headers.get("cookie") ?? "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k, v]) => k && v)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );
  return {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
    fbp: cookies._fbp as string | undefined,
    fbc: cookies._fbc as string | undefined,
    // Raw IPs are never stored: rate limits use this one-way hash.
    visitor: sha256(`albarakha:${ip ?? "unknown"}`).slice(0, 32),
  };
}
