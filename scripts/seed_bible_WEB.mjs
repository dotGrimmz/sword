#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error(
    "❌ Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) environment variable."
  );
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variable."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const GITHUB_JSON_DIRECTORY =
  "https://github.com/TehShrike/world-english-bible/tree/master/json";
const RAW_GITHUB_JSON_BASE =
  "https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json";

const buildBookJsonUrl = (bookKey) => {
  const filename = bookKey.toLowerCase().replace(/_/g, "");
  return `${RAW_GITHUB_JSON_BASE}/${filename}.json`;
};

const BOOKS = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1_Samuel",
  "2_Samuel",
  "1_Kings",
  "2_Kings",
  "1_Chronicles",
  "2_Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song_of_Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1_Corinthians",
  "2_Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1_Thessalonians",
  "2_Thessalonians",
  "1_Timothy",
  "2_Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1_Peter",
  "2_Peter",
  "1_John",
  "2_John",
  "3_John",
  "Jude",
  "Revelation",
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeFetch = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed with ${res.status} ${res.statusText}`);
  }
  return res.json();
};

const normaliseName = (bookKey) => bookKey.replace(/_/g, " ");

const makeAbbreviation = (name) =>
  name
    .replace(/[^0-9A-Za-z ]/g, "")
    .split(" ")
    .map((part) => part.at(0)?.toUpperCase() ?? "")
    .join("")
    .slice(0, 3);

const buildChunkRow = (translationId, bookId, chapter, verses) => ({
  translation_id: translationId,
  book_id: bookId,
  chapter,
  content_json: {
    verses: verses.map(({ verse, text }) => ({ verse, text })),
  },
});

const groupVersesByChapter = (entries) => {
  const chapterVerseParts = new Map();

  for (const entry of entries) {
    const chapterNumber = Number(entry.chapterNumber ?? entry.chapter);
    const verseNumber = Number(entry.verseNumber ?? entry.verse);
    const rawText =
      typeof entry.value === "string"
        ? entry.value
        : typeof entry.text === "string"
        ? entry.text
        : "";

    if (!Number.isFinite(chapterNumber) || !Number.isFinite(verseNumber)) {
      continue;
    }

    if (!chapterVerseParts.has(chapterNumber)) {
      chapterVerseParts.set(chapterNumber, new Map());
    }

    const verseMap = chapterVerseParts.get(chapterNumber);

    if (!verseMap.has(verseNumber)) {
      verseMap.set(verseNumber, []);
    }

    const cleaned = rawText.replace(/\s+/g, " ").trim();
    if (cleaned.length > 0) {
      verseMap.get(verseNumber).push(cleaned);
    }
  }

  const sortedChapterNumbers = [...chapterVerseParts.keys()].sort(
    (a, b) => a - b
  );
  const result = new Map();

  for (const chapterNumber of sortedChapterNumbers) {
    const verseMap = chapterVerseParts.get(chapterNumber);
    if (!verseMap) {
      continue;
    }

    const verseEntries = [...verseMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([verse, parts]) => ({
        verse,
        text: parts.join(" ").replace(/\s+/g, " ").trim(),
      }))
      .filter(({ text }) => text.length > 0);

    if (verseEntries.length > 0) {
      result.set(chapterNumber, verseEntries);
    }
  }

  return result;
};

async function ensureTranslation() {
  const { data, error } = await supabase
    .from("bible_translations")
    .select("id")
    .eq("code", "WEB")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up WEB translation: ${error.message}`);
  }

  if (data) {
    return { id: data.id, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bible_translations")
    .insert({
      code: "WEB",
      name: "World English Bible",
      language: "English",
      version: "Public Domain",
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to create WEB translation: ${insertError.message}`);
  }

  return { id: inserted.id, created: true };
}

async function ensureBook(translationId, bookKey, orderIndex) {
  const name = normaliseName(bookKey);
  const abbreviation = makeAbbreviation(name);

  const { data, error } = await supabase
    .from("bible_books")
    .select("id, chapters")
    .eq("translation_id", translationId)
    .eq("name", name)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up book ${name}: ${error.message}`);
  }

  if (data) {
    return { id: data.id, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bible_books")
    .insert({
      translation_id: translationId,
      order_index: orderIndex,
      name,
      abbreviation,
      chapters: 0,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert book ${name}: ${insertError.message}`);
  }

  return { id: inserted.id, created: true };
}

async function upsertChapters(translationId, bookId, versesByChapter) {
  let inserted = 0;
  let updated = 0;

  for (const [chapterKey, verseList] of versesByChapter.entries()) {
    const chapter = Number(chapterKey);

    const { data: existing, error: selectError } = await supabase
      .from("scripture_chunks")
      .select("id")
      .eq("translation_id", translationId)
      .eq("book_id", bookId)
      .eq("chapter", chapter)
      .maybeSingle();

    if (selectError) {
      throw new Error(
        `Failed to look up chapter ${chapter} for book ${bookId}: ${selectError.message}`
      );
    }

    const chunkRow = buildChunkRow(translationId, bookId, chapter, verseList);

    if (existing) {
      const { error: updateError } = await supabase
        .from("scripture_chunks")
        .update(chunkRow)
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(
          `Failed to update chapter ${chapter} for book ${bookId}: ${updateError.message}`
        );
      }
      updated += 1;
    } else {
      const { error: insertError } = await supabase
        .from("scripture_chunks")
        .insert(chunkRow);

      if (insertError) {
        throw new Error(
          `Failed to insert chapter ${chapter} for book ${bookId}: ${insertError.message}`
        );
      }
      inserted += 1;
    }

    await delay(75);
  }

  return { inserted, updated };
}

async function updateChapterCount(bookId, chapterCount) {
  const { error } = await supabase
    .from("bible_books")
    .update({ chapters: chapterCount })
    .eq("id", bookId);

  if (error) {
    throw new Error(
      `Failed to update chapter count for book ${bookId}: ${error.message}`
    );
  }
}

async function main() {
  console.log("🕊️  Seeding World English Bible into Supabase...");

  const { id: translationId, created: translationCreated } =
    await ensureTranslation();

  if (translationCreated) {
    console.log("✅ Created WEB translation record");
  } else {
    console.log("ℹ️  WEB translation already exists — updating data");
  }

  const totals = {
    booksCreated: 0,
    booksExisting: 0,
    chaptersInserted: 0,
    chaptersUpdated: 0,
  };

  let orderIndex = 1;

  for (const bookKey of BOOKS) {
    console.log(`📖 Processing ${bookKey}...`);

    let rawEntries;
    try {
      rawEntries = await safeFetch(buildBookJsonUrl(bookKey));
    } catch (error) {
      console.warn(`⚠️  Skipping ${bookKey}: ${error.message}`);
      continue;
    }

    if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
      console.warn(`⚠️  No verses found for ${bookKey}, skipping.`);
      continue;
    }

    const { id: bookId, created: bookCreated } = await ensureBook(
      translationId,
      bookKey,
      orderIndex
    );

    if (bookCreated) {
      totals.booksCreated += 1;
    } else {
      totals.booksExisting += 1;
    }

    orderIndex += 1;

    const versesByChapter = groupVersesByChapter(rawEntries);

    if (versesByChapter.size === 0) {
      console.warn(`⚠️  Unable to derive verses for ${bookKey}, skipping.`);
      continue;
    }

    const chapterCount = versesByChapter.size;

    const { inserted, updated } = await upsertChapters(
      translationId,
      bookId,
      versesByChapter
    );

    totals.chaptersInserted += inserted;
    totals.chaptersUpdated += updated;

    await updateChapterCount(bookId, chapterCount);

    console.log(
      `   ✅ ${bookKey} complete (${chapterCount} chapters, ${inserted} inserted, ${updated} updated)`
    );
  }

  console.log("🎉 Seeding finished.");
  console.log(
    `📊 Summary → Books created: ${totals.booksCreated}, books skipped: ${totals.booksExisting}, chapters inserted: ${totals.chaptersInserted}, chapters updated: ${totals.chaptersUpdated}`
  );
}

main().catch((error) => {
  console.error("💥 Fatal error:", error.message);
  process.exit(1);
});
