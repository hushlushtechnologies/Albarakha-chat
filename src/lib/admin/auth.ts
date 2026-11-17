import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";

// Staff logins for /admin, set in .env.local / Vercel:
//   ADMIN_USERS="Sara:long-password-1,Ali:long-password-2"
//   ADMIN_SESSION_SECRET=<32+ random characters>
// Removing someone from ADMIN_USERS, or changing their password, logs them out.

export const COOKIE = "abk_admin";
const SESSION_DAYS = 7;

type Staff = { name: string; password: string };

function staffList(): Staff[] {
  return (process.env.ADMIN_USERS ?? "")
    .split(",")
    .map((entry) => {
      const i = entry.indexOf(":");
      return i > 0 ? { name: entry.slice(0, i).trim(), password: entry.slice(i + 1).trim() } : null;
    })
    .filter((s): s is Staff => !!s && !!s.name && s.password.length >= 8);
}

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET ?? "";
  return s.length >= 32 ? s : null;
}

export function adminConfigured(): boolean {
  return !!secret() && staffList().length > 0;
}

const sign = (value: string, key: string) => createHmac("sha256", key).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Ties the session to the current password without storing it in the cookie.
const passwordTag = (s: Staff, key: string) => sign(`pw:${s.name}:${s.password}`, key).slice(0, 12);

export function checkLogin(name: string, password: string): string | null {
  const key = secret();
  if (!key) return null;
  const wanted = name.trim().toLowerCase();
  let match: Staff | null = null;
  for (const s of staffList()) {
    // Compare every entry so timing doesn't reveal which names exist.
    const ok = s.name.toLowerCase() === wanted && safeEqual(s.password, password);
    if (ok) match = s;
  }
  if (!match) return null;
  const payload = Buffer.from(
    JSON.stringify({ u: match.name, t: passwordTag(match, key), exp: Date.now() + SESSION_DAYS * 86_400_000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyToken(token: string | undefined): string | null {
  const key = secret();
  if (!key || !token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac || !safeEqual(sign(payload, key), mac)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; t: string; exp: number };
    if (!data.exp || data.exp < Date.now()) return null;
    const staff = staffList().find((s) => s.name === data.u);
    if (!staff || passwordTag(staff, key) !== data.t) return null;
    return staff.name;
  } catch {
    return null;
  }
}

export async function currentStaff(): Promise<string | null> {
  await connection(); // always checked per request, never prerendered
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE)?.value);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 86_400,
};

// Slows down password guessing: 8 failed tries per IP per 15 minutes.
const failures = new Map<string, number[]>();
export function loginBlocked(ip: string) {
  const since = Date.now() - 15 * 60_000;
  const recent = (failures.get(ip) ?? []).filter((t) => t > since);
  failures.set(ip, recent);
  return recent.length >= 8;
}
export function noteFailure(ip: string) {
  failures.set(ip, [...(failures.get(ip) ?? []), Date.now()]);
}
