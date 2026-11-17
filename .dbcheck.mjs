import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf("=");return [l.slice(0,i), l.slice(i+1).trim().replace(/^"|"$/g,"")]}));
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
for (const t of ["leads","messages"]) {
  const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
  console.log(t, error ? "ERROR: " + error.message : `ok (${count} rows)`);
}
const cols = await sb.from("leads").select("investor_type,timeline,notes,source,page_url,fbclid").limit(1);
console.log("new lead columns:", cols.error ? "ERROR: " + cols.error.message : "ok");
