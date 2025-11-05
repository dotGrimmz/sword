#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zuurfduimfwclfpptyyz.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1dXJmZHVpbWZ3Y2xmcHB0eXl6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTY3Mjg5OCwiZXhwIjoyMDc1MjQ4ODk4fQ.Xc-M0J-2zztFwcVogV5BvPc4khAE2frq0cLFaKdNu_4";
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

const BIBLE_API_BASE = "https://bible-api.com/";

const SOURCE_BIBLE_API = "bible-api";
const SOURCE_API_BIBLE = "api-bible";
const SOURCE_GITHUB_JSON = "github-json";

const TRANSLATIONS = [
  {
    code: "WEB",
    apiCode: "web",
    name: "World English Bible",
    language: "English",
    version: "Public Domain",
    source: SOURCE_BIBLE_API,
  },
  {
    code: "KJV",
    name: "King James Version",
    language: "English",
    version: "Public Domain",
    source: SOURCE_API_BIBLE,
    bibleId: "de4e12af7f28f599-01",
  },
  {
    code: "NIV",
    name: "New International Version",
    language: "English",
    version: "2011",
    source: SOURCE_GITHUB_JSON,
    githubBaseUrl: "https://raw.githubusercontent.com/aruljohn/Bible-niv/main/",
    bookFileOverrides: {
      Song_of_Solomon: "Song Of Solomon",
    },
  },
];

const requestedCodes = process.argv
  .slice(2)
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);

const translationsToSeed =
  requestedCodes.length > 0
    ? TRANSLATIONS.filter((translation) =>
        requestedCodes.includes(translation.code)
      )
    : TRANSLATIONS;

const MAX_FETCH_RETRIES = 6;
const BASE_RETRY_DELAY_MS = 1500;
const CHAPTER_FETCH_DELAY_MS = 1000;
const API_BIBLE_BASE_URL = "https://api.scripture.api.bible/v1/";
const API_BIBLE_KEY = "VH2tPQtPmtxeKOEeMxYrJ";

const missingCodes = requestedCodes.filter(
  (code) => !translationsToSeed.some((translation) => translation.code === code)
);

if (missingCodes.length > 0) {
  console.error(
    `❌ Unknown translation code(s): ${missingCodes.join(
      ", "
    )}. Supported codes: ${TRANSLATIONS.map(({ code }) => code).join(", ")}`
  );
  process.exit(1);
}

const requiresApiBible = translationsToSeed.some(
  (translation) => translation.source === SOURCE_API_BIBLE
);

if (requiresApiBible && !API_BIBLE_KEY) {
  console.error(
    "❌ Missing API_BIBLE_KEY environment variable required for API.Bible access."
  );
  process.exit(1);
}

const BOOKS = [
  { key: "Genesis", chapters: 50 },
  { key: "Exodus", chapters: 40 },
  { key: "Leviticus", chapters: 27 },
  { key: "Numbers", chapters: 36 },
  { key: "Deuteronomy", chapters: 34 },
  { key: "Joshua", chapters: 24 },
  { key: "Judges", chapters: 21 },
  { key: "Ruth", chapters: 4 },
  { key: "1_Samuel", chapters: 31 },
  { key: "2_Samuel", chapters: 24 },
  { key: "1_Kings", chapters: 22 },
  { key: "2_Kings", chapters: 25 },
  { key: "1_Chronicles", chapters: 29 },
  { key: "2_Chronicles", chapters: 36 },
  { key: "Ezra", chapters: 10 },
  { key: "Nehemiah", chapters: 13 },
  { key: "Esther", chapters: 10 },
  { key: "Job", chapters: 42 },
  { key: "Psalms", chapters: 150 },
  { key: "Proverbs", chapters: 31 },
  { key: "Ecclesiastes", chapters: 12 },
  {
    key: "Song_of_Solomon",
    chapters: 8,
    apiNames: ["Song of Songs", "Song of Solomon"],
  },
  { key: "Isaiah", chapters: 66 },
  { key: "Jeremiah", chapters: 52 },
  { key: "Lamentations", chapters: 5 },
  { key: "Ezekiel", chapters: 48 },
  { key: "Daniel", chapters: 12 },
  { key: "Hosea", chapters: 14 },
  { key: "Joel", chapters: 3 },
  { key: "Amos", chapters: 9 },
  { key: "Obadiah", chapters: 1 },
  { key: "Jonah", chapters: 4 },
  { key: "Micah", chapters: 7 },
  { key: "Nahum", chapters: 3 },
  { key: "Habakkuk", chapters: 3 },
  { key: "Zephaniah", chapters: 3 },
  { key: "Haggai", chapters: 2 },
  { key: "Zechariah", chapters: 14 },
  { key: "Malachi", chapters: 4 },
  { key: "Matthew", chapters: 28 },
  { key: "Mark", chapters: 16 },
  { key: "Luke", chapters: 24 },
  { key: "John", chapters: 21 },
  { key: "Acts", chapters: 28 },
  { key: "Romans", chapters: 16 },
  { key: "1_Corinthians", chapters: 16 },
  { key: "2_Corinthians", chapters: 13 },
  { key: "Galatians", chapters: 6 },
  { key: "Ephesians", chapters: 6 },
  { key: "Philippians", chapters: 4 },
  { key: "Colossians", chapters: 4 },
  { key: "1_Thessalonians", chapters: 5 },
  { key: "2_Thessalonians", chapters: 3 },
  { key: "1_Timothy", chapters: 6 },
  { key: "2_Timothy", chapters: 4 },
  { key: "Titus", chapters: 3 },
  { key: "Philemon", chapters: 1 },
  { key: "Hebrews", chapters: 13 },
  { key: "James", chapters: 5 },
  { key: "1_Peter", chapters: 5 },
  { key: "2_Peter", chapters: 3 },
  { key: "1_John", chapters: 5 },
  { key: "2_John", chapters: 1 },
  { key: "3_John", chapters: 1 },
  { key: "Jude", chapters: 1 },
  { key: "Revelation", chapters: 22 },
];

const API_BIBLE_BOOK_IDS = {
  Genesis: "GEN",
  Exodus: "EXO",
  Leviticus: "LEV",
  Numbers: "NUM",
  Deuteronomy: "DEU",
  Joshua: "JOS",
  Judges: "JDG",
  Ruth: "RUT",
  "1_Samuel": "1SA",
  "2_Samuel": "2SA",
  "1_Kings": "1KI",
  "2_Kings": "2KI",
  "1_Chronicles": "1CH",
  "2_Chronicles": "2CH",
  Ezra: "EZR",
  Nehemiah: "NEH",
  Esther: "EST",
  Job: "JOB",
  Psalms: "PSA",
  Proverbs: "PRO",
  Ecclesiastes: "ECC",
  Song_of_Solomon: "SNG",
  Isaiah: "ISA",
  Jeremiah: "JER",
  Lamentations: "LAM",
  Ezekiel: "EZK",
  Daniel: "DAN",
  Hosea: "HOS",
  Joel: "JOL",
  Amos: "AMO",
  Obadiah: "OBA",
  Jonah: "JON",
  Micah: "MIC",
  Nahum: "NAM",
  Habakkuk: "HAB",
  Zephaniah: "ZEP",
  Haggai: "HAG",
  Zechariah: "ZEC",
  Malachi: "MAL",
  Matthew: "MAT",
  Mark: "MRK",
  Luke: "LUK",
  John: "JHN",
  Acts: "ACT",
  Romans: "ROM",
  "1_Corinthians": "1CO",
  "2_Corinthians": "2CO",
  Galatians: "GAL",
  Ephesians: "EPH",
  Philippians: "PHP",
  Colossians: "COL",
  "1_Thessalonians": "1TH",
  "2_Thessalonians": "2TH",
  "1_Timothy": "1TI",
  "2_Timothy": "2TI",
  Titus: "TIT",
  Philemon: "PHM",
  Hebrews: "HEB",
  James: "JAS",
  "1_Peter": "1PE",
  "2_Peter": "2PE",
  "1_John": "1JN",
  "2_John": "2JN",
  "3_John": "3JN",
  Jude: "JUD",
  Revelation: "REV",
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeFetch = async (url, options = undefined, attempt = 1) => {
  const res = await fetch(url, options);

  if (res.ok) {
    return res.json();
  }

  const isRetriable =
    res.status === 429 || (res.status >= 500 && res.status < 600);

  let errorDetail = "";
  try {
    const bodyText = await res.text();
    if (bodyText && bodyText.length > 0) {
      errorDetail = ` → ${bodyText.slice(0, 200)}${
        bodyText.length > 200 ? "…" : ""
      }`;
    }
  } catch (bodyError) {
    errorDetail = ` (failed to read error body: ${bodyError.message})`;
  }

  if (isRetriable && attempt < MAX_FETCH_RETRIES) {
    const retryDelay = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
    console.warn(
      `⏳ ${res.status} ${
        res.statusText
      }${errorDetail} for ${decodeURIComponent(
        url.toString()
      )}. Retrying in ${retryDelay}ms (attempt ${
        attempt + 1
      }/${MAX_FETCH_RETRIES})`
    );
    await delay(retryDelay);
    return safeFetch(url, options, attempt + 1);
  }

  throw new Error(
    `Request failed with ${res.status} ${res.statusText}${errorDetail}`
  );
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

const buildBibleApiChapterUrl = (bookName, chapter, translationApiCode) => {
  const url = new URL(
    encodeURIComponent(`${bookName} ${chapter}`),
    BIBLE_API_BASE
  );
  url.searchParams.set("translation", translationApiCode);
  return url.toString();
};

const fetchChapterFromBibleApi = async (
  bookName,
  chapter,
  translationApiCode
) => {
  const url = buildBibleApiChapterUrl(bookName, chapter, translationApiCode);
  const payload = await safeFetch(url);
  const verses = Array.isArray(payload?.verses) ? payload.verses : [];
  return verses
    .map((verse) => ({
      chapterNumber: Number(verse.chapter ?? verse.chapterNumber),
      verseNumber: Number(verse.verse ?? verse.verseNumber),
      text: typeof verse.text === "string" ? verse.text : "",
    }))
    .filter(
      ({ chapterNumber, verseNumber, text }) =>
        Number.isFinite(chapterNumber) &&
        Number.isFinite(verseNumber) &&
        chapterNumber === chapter &&
        text.trim().length > 0
    );
};

const resolveApiNames = (book) => {
  if (Array.isArray(book.apiNames) && book.apiNames.length > 0) {
    return book.apiNames;
  }
  if (book.apiName) {
    return [book.apiName];
  }
  return [normaliseName(book.key)];
};

const fetchBookEntriesFromBibleApi = async (translation, book) => {
  if (!translation.apiCode) {
    throw new Error(
      `[${translation.code}] Missing apiCode configuration for bible-api source`
    );
  }

  const bookNames = resolveApiNames(book);
  const entries = [];

  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    let chapterVerses = [];
    for (const bookName of bookNames) {
      try {
        chapterVerses = await fetchChapterFromBibleApi(
          bookName,
          chapter,
          translation.apiCode
        );
        if (chapterVerses.length > 0) {
          break;
        }
      } catch (error) {
        console.warn(
          `[${translation.code}] ⚠️  Failed to fetch ${bookName} ${chapter} from bible-api: ${error.message}`
        );
      }
    }

    if (chapterVerses.length === 0) {
      console.warn(
        `[${translation.code}] ⚠️  No verses returned for ${normaliseName(
          book.key
        )} ${chapter}, skipping chapter.`
      );
      continue;
    }

    entries.push(...chapterVerses);
    await delay(CHAPTER_FETCH_DELAY_MS);
  }

  return entries;
};

const resolveGithubBookFilename = (translation, bookKey) => {
  const overrides = translation.bookFileOverrides ?? {};
  if (overrides[bookKey]) {
    return overrides[bookKey];
  }
  // Normalise underscores to spaces ; keep casing as-is except ensure leading chars uppercase
  const name = normaliseName(bookKey);
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
};

const buildGithubBookUrl = (translation, book) => {
  if (!translation.githubBaseUrl) {
    throw new Error(
      `[${translation.code}] Missing githubBaseUrl configuration for GitHub JSON source`
    );
  }
  const filename = `${resolveGithubBookFilename(translation, book.key)}.json`;
  return new URL(encodeURIComponent(filename), translation.githubBaseUrl);
};

const buildApiBibleUrl = (path, searchParams = new Map()) => {
  const url = new URL(path, API_BIBLE_BASE_URL);
  for (const [key, value] of searchParams.entries()) {
    url.searchParams.set(key, value);
  }
  return url;
};

const fetchApiBibleChapter = async (translation, chapterId) => {
  if (!translation.bibleId) {
    throw new Error(
      `[${translation.code}] Missing bibleId configuration for API.Bible source`
    );
  }

  const url = buildApiBibleUrl(
    `bibles/${translation.bibleId}/passages/${chapterId}`,
    new Map([["content-type", "text"]])
  );

  const payload = await safeFetch(url, {
    headers: {
      "api-key": API_BIBLE_KEY,
      Accept: "application/json",
    },
  });

  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("Unexpected API.Bible passage response shape");
  }

  return payload.data;
};

const parseApiBiblePlainTextContent = (content) => {
  if (typeof content !== "string" || content.trim().length === 0) {
    return [];
  }

  const normalized = content
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .trim();

  const verseMatches = [];
  const versePattern = /(?:^|\n)(\d{1,3})\s/g;
  let match;

  while ((match = versePattern.exec(normalized)) !== null) {
    verseMatches.push({
      verseNumber: Number(match[1]),
      index: match.index,
      length: match[0].length,
    });
  }

  if (verseMatches.length === 0) {
    return [];
  }

  const verses = [];

  for (let i = 0; i < verseMatches.length; i += 1) {
    const { verseNumber, index, length } = verseMatches[i];
    const start = index + length;
    const end =
      i + 1 < verseMatches.length
        ? verseMatches[i + 1].index
        : normalized.length;

    const text = normalized
      .slice(start, end)
      .replace(/\s+/g, " ")
      .replace(/\[[^\]]*]/g, "")
      .trim();

    if (Number.isFinite(verseNumber) && text.length > 0) {
      verses.push({ verseNumber, text });
    }
  }

  return verses;
};

const fetchBookEntriesFromApiBible = async (translation, book) => {
  const apiBibleId = API_BIBLE_BOOK_IDS[book.key];

  if (!apiBibleId) {
    console.warn(
      `[${translation.code}] ⚠️  No API.Bible book ID mapping for ${book.key}, skipping book.`
    );
    return [];
  }

  const entries = [];

  for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
    const chapterId = `${apiBibleId}.${chapter}`;

    let chapterData;
    try {
      chapterData = await fetchApiBibleChapter(translation, chapterId);
    } catch (error) {
      console.warn(
        `[${translation.code}] ⚠️  Failed to fetch ${chapterId} from API.Bible: ${error.message}`
      );
      continue;
    }

    if (typeof chapterData.content !== "string") {
      console.warn(
        `[${translation.code}] ⚠️  Missing textual content for ${chapterId}, skipping chapter.`
      );
      continue;
    }

    const verses = parseApiBiblePlainTextContent(chapterData.content).map(
      ({ verseNumber, text }) => ({
        chapterNumber: chapter,
        verseNumber,
        text,
      })
    );

    if (verses.length === 0) {
      console.warn(
        `[${translation.code}] ⚠️  Unable to parse verses for ${chapterId}, skipping chapter.`
      );
      continue;
    }

    entries.push(...verses);

    await delay(CHAPTER_FETCH_DELAY_MS);
  }

  return entries;
};

const fetchBookEntriesFromGithubJson = async (translation, book) => {
  let payload;

  try {
    payload = await safeFetch(buildGithubBookUrl(translation, book));
  } catch (error) {
    console.warn(
      `[${translation.code}] ⚠️  Failed to fetch ${book.key} from GitHub: ${error.message}`
    );
    return [];
  }

  const chapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
  if (chapters.length === 0) {
    console.warn(
      `[${translation.code}] ⚠️  No chapters found in GitHub payload for ${book.key}`
    );
    return [];
  }

  const entries = [];

  for (const chapter of chapters) {
    const chapterNumber = Number(chapter.chapter);
    if (!Number.isFinite(chapterNumber)) {
      continue;
    }

    const verses = Array.isArray(chapter.verses) ? chapter.verses : [];
    for (const verse of verses) {
      const verseNumber = Number(verse.verse);
      const text =
        typeof verse.text === "string" ? verse.text.replace(/\s+/g, " ").trim() : "";

      if (
        Number.isFinite(verseNumber) &&
        text.length > 0
      ) {
        entries.push({
          chapterNumber,
          verseNumber,
          text,
        });
      }
    }
  }

  return entries;
};

const fetchBookEntries = async (translation, book) => {
  if (translation.source === SOURCE_API_BIBLE) {
    return fetchBookEntriesFromApiBible(translation, book);
  }

  if (translation.source === SOURCE_GITHUB_JSON) {
    return fetchBookEntriesFromGithubJson(translation, book);
  }

  return fetchBookEntriesFromBibleApi(translation, book);
};

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

async function ensureTranslation(translation) {
  const { data, error } = await supabase
    .from("bible_translations")
    .select("id")
    .eq("code", translation.code)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to look up ${translation.code} translation: ${error.message}`
    );
  }

  if (data) {
    return { id: data.id, created: false };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("bible_translations")
    .insert({
      code: translation.code,
      name: translation.name,
      language: translation.language,
      version: translation.version,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(
      `Failed to create ${translation.code} translation: ${insertError.message}`
    );
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

async function seedTranslation(translation) {
  const sourceLabel =
    translation.source === SOURCE_API_BIBLE
      ? "api.scripture.api.bible data"
      : "bible-api.com data";

  console.log(
    `\n📚 Seeding ${translation.name} (${translation.code}) via ${sourceLabel}...`
  );

  const { id: translationId, created: translationCreated } =
    await ensureTranslation(translation);

  if (translationCreated) {
    console.log(`✅ Created ${translation.code} translation record`);
  } else {
    console.log(
      `ℹ️  ${translation.code} translation already exists — updating data`
    );
  }

  const totals = {
    booksCreated: 0,
    booksExisting: 0,
    chaptersInserted: 0,
    chaptersUpdated: 0,
  };

  let orderIndex = 1;

  for (const book of BOOKS) {
    const bookKey = book.key;
    console.log(`[${translation.code}] 📖 Processing ${bookKey}...`);

    const rawEntries = await fetchBookEntries(translation, book);

    if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
      console.warn(
        `[${translation.code}] ⚠️  No verses found for ${bookKey}, skipping.`
      );
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
      console.warn(
        `[${translation.code}] ⚠️  Unable to derive verses for ${bookKey}, skipping.`
      );
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

  console.log(
    `📊 ${translation.code} summary → Books created: ${totals.booksCreated}, books skipped: ${totals.booksExisting}, chapters inserted: ${totals.chaptersInserted}, chapters updated: ${totals.chaptersUpdated}`
  );
}

async function main() {
  console.log("🕊️  Seeding Bible translations into Supabase...");

  for (const translation of translationsToSeed) {
    await seedTranslation(translation);
  }

  console.log("\n🎉 Seeding finished for requested translations.");
}

main().catch((error) => {
  console.error("💥 Fatal error:", error.message);
  process.exit(1);
});
