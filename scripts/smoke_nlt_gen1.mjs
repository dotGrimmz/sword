#!/usr/bin/env node
/**
 * Smoke-test NLT GEN.1 from API.Bible (never prints the API key).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFiles() {
  for (const file of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const rawLine of readFileSync(path, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadEnvFiles();

const BIBLE_ID = "d6e14a625393b4da-01";
const key = process.env.API_BIBLE_KEY;
if (!key) {
  console.error("FAIL missing API_BIBLE_KEY");
  process.exit(1);
}

function parseVerses(content) {
  if (typeof content !== "string" || !content.trim()) return [];
  const normalized = content.replace(/\r/g, "").replace(/\u00a0/g, " ").replace(/¶/g, " ").trim();
  const verseMatches = [];
  let match;
  const bracketPattern = /\[(\d{1,3})\]\s*/g;
  while ((match = bracketPattern.exec(normalized)) !== null) {
    verseMatches.push({ verseNumber: Number(match[1]), index: match.index, length: match[0].length });
  }
  if (verseMatches.length === 0) {
    const linePattern = /(?:^|\n)(\d{1,3})\s+/g;
    while ((match = linePattern.exec(normalized)) !== null) {
      verseMatches.push({ verseNumber: Number(match[1]), index: match.index, length: match[0].length });
    }
  }
  const verses = [];
  for (let i = 0; i < verseMatches.length; i += 1) {
    const { verseNumber, index, length } = verseMatches[i];
    const start = index + length;
    const end = i + 1 < verseMatches.length ? verseMatches[i + 1].index : normalized.length;
    const text = normalized.slice(start, end).replace(/\s+/g, " ").replace(/\[[^\]]*]/g, "").trim();
    if (Number.isFinite(verseNumber) && text.length > 0) verses.push({ verseNumber, text });
  }
  return verses;
}

const url = `https://api.scripture.api.bible/v1/bibles/${BIBLE_ID}/passages/GEN.1?content-type=text`;
const res = await fetch(url, { headers: { "api-key": key, Accept: "application/json" } });
const body = await res.text();
console.log("http", res.status);
if (!res.ok) {
  console.error("FAIL body", body.slice(0, 200));
  process.exit(1);
}
const json = JSON.parse(body);
const content = json?.data?.content;
console.log("typeof_content", typeof content);
console.log("preview", typeof content === "string" ? content.slice(0, 400) : String(content).slice(0, 400));

const verses = parseVerses(content);
console.log("verse_count", verses.length);
for (const v of verses.slice(0, 3)) {
  console.log(`v${v.verseNumber}`, v.text.slice(0, 80));
}
if (verses.length) console.log("last", verses[verses.length - 1].verseNumber);

const pass = verses.length >= 20;
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
