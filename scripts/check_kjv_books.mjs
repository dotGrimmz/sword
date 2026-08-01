#!/usr/bin/env node
/**
 * One-off: hit API.Bible KJV books endpoint and print counts only.
 * Reads API_BIBLE_KEY from process env or .env.local (never prints the key).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BIBLE_ID = "de4e12af7f28f599-01";
const BOOKS_URL = `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/books`;

function loadKey() {
  if (process.env.API_BIBLE_KEY) return process.env.API_BIBLE_KEY;
  for (const file of [".env.local", ".env"]) {
    try {
      const text = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*API_BIBLE_KEY\s*=\s*(.+?)\s*$/);
        if (m) return m[1].replace(/^["']|["']$/g, "");
      }
    } catch {
      // missing file ok
    }
  }
  return null;
}

const key = loadKey();
if (!key) {
  console.error("Missing API_BIBLE_KEY");
  process.exit(1);
}

const res = await fetch(BOOKS_URL, { headers: { "api-key": key } });
const body = await res.text();
console.log("http", res.status);

if (!res.ok) {
  console.error("error_body", body.slice(0, 300));
  process.exit(1);
}

const json = JSON.parse(body);
const books = Array.isArray(json.data) ? json.data : [];
console.log("count", books.length);

const ot = books.filter((b) => {
  const order = Number(b.bookOrder ?? b.order ?? 0);
  return order > 0 && order <= 39;
});
const nt = books.filter((b) => {
  const order = Number(b.bookOrder ?? b.order ?? 0);
  return order >= 40;
});
console.log("ot_guess", ot.length || "(no bookOrder)");
console.log("nt_guess", nt.length || "(no bookOrder)");
console.log("ids", books.map((b) => b.id).join(","));
console.log(
  "names",
  books.map((b) => b.name || b.nameLong || b.id).join(" | "),
);

const PROTESTANT_66 = [
  "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA","1KI","2KI",
  "1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO","ECC","SNG","ISA","JER",
  "LAM","EZK","DAN","HOS","JOL","AMO","OBA","JON","MIC","NAM","HAB","ZEP",
  "HAG","ZEC","MAL","MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL",
  "EPH","PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS","1PE",
  "2PE","1JN","2JN","3JN","JUD","REV",
];
const ids = new Set(books.map((b) => b.id));
const missing = PROTESTANT_66.filter((id) => !ids.has(id));
const extra = books.map((b) => b.id).filter((id) => !PROTESTANT_66.includes(id));
console.log("missing_vs_66", missing.length ? missing.join(",") : "none");
console.log("extra_vs_66", extra.length ? extra.join(",") : "none");
console.log("is_exact_66", books.length === 66 && missing.length === 0 && extra.length === 0);
