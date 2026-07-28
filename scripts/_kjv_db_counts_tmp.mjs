import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
function loadEnv(path) {
  let text = readFileSync(path, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let k = t.slice(0, i).replace(/^export\s+/, "").trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}
const env = loadEnv("/home/rakeem/Repos/sword/.env.local");
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY);
const tr = await sb.from("bible_translations").select("id,abbreviation").or("abbreviation.eq.KJV,code.eq.KJV");
const tid = (tr.data && tr.data[0] && tr.data[0].id) || null;
if (!tid) { console.log("KJV translation not found", tr.error && tr.error.message); process.exit(0); }
const books = await sb.from("bible_books").select("*", { count: "exact", head: true }).eq("translation_id", tid);
const chunks = await sb.from("scripture_chunks").select("*", { count: "exact", head: true }).eq("translation_id", tid);
console.log("bible_books_KJV", books.count);
console.log("scripture_chunks_KJV", chunks.count);
