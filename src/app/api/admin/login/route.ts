import { z } from "zod";
import { adminConfigured, checkLogin, cookieOptions, COOKIE, loginBlocked, noteFailure } from "@/lib/admin/auth";
import { requestInfo } from "@/lib/request";

const Body = z.object({ name: z.string().min(1).max(60), password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (!adminConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });
  const { visitor } = requestInfo(req);
  if (loginBlocked(visitor)) return Response.json({ error: "too_many" }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const token = parsed.success ? checkLogin(parsed.data.name, parsed.data.password) : null;
  if (!token) {
    noteFailure(visitor);
    await new Promise((r) => setTimeout(r, 600));
    return Response.json({ error: "invalid" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  const c = cookieOptions;
  res.headers.append(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=${c.path}; Max-Age=${c.maxAge}; HttpOnly; SameSite=Strict${c.secure ? "; Secure" : ""}`,
  );
  return res;
}
