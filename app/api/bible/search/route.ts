import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchBooksForTranslation,
  fetchTranslationByCode,
} from "@/lib/bible/queries";
import {
  normalizeWhitespace,
  parseLimitParam,
} from "@/lib/bible/utils";
import type {
  BibleSearchResponse,
  BibleSearchResult,
  BibleVerse,
} from "@/types/bible";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MIN_QUERY_LENGTH = 2;

const buildSearchNeedle = (term: string) => term.toLowerCase();

const isVerseCandidate = (verse: unknown): verse is BibleVerse =>
  typeof verse === "object" &&
  verse !== null &&
  typeof (verse as { verse?: unknown }).verse === "number" &&
  typeof (verse as { text?: unknown }).text === "string";

const verseMatchesQuery = (verse: BibleVerse, needle: string) =>
  verse.text.toLowerCase().includes(needle);

const toSearchResult = (
  bookId: string,
  bookName: string,
  bookAbbreviation: string | null,
  chapter: number,
  verse: BibleVerse
): BibleSearchResult => ({
  bookId,
  bookName,
  bookAbbreviation,
  chapter,
  verse: verse.verse,
  text: verse.text,
});

const normaliseQuery = (value: string | null) => {
  if (!value) {
    return "";
  }

  return normalizeWhitespace(value);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawQuery = url.searchParams.get("q");
  const translationCode = url.searchParams.get("translation")?.trim();
  const limitParam = url.searchParams.get("limit");

  const limit = parseLimitParam(limitParam, DEFAULT_LIMIT, MAX_LIMIT);

  if (limit === null) {
    return NextResponse.json(
      { error: "Limit must be a positive integer" },
      { status: 400 }
    );
  }

  const query = normaliseQuery(rawQuery);

  if (!query || query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Query must be at least two characters" },
      { status: 400 }
    );
  }

  if (!translationCode) {
    return NextResponse.json(
      { error: "Missing required translation query parameter" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: translation,
    error: translationError,
  } = await fetchTranslationByCode(supabase, translationCode);

  if (translationError) {
    return NextResponse.json(
      { error: "Failed to look up translation" },
      { status: 500 }
    );
  }

  if (!translation) {
    return NextResponse.json(
      { error: "Translation not found" },
      { status: 404 }
    );
  }

  const { data: books, error: booksError } = await fetchBooksForTranslation(
    supabase,
    translation.id
  );

  if (booksError) {
    return NextResponse.json(
      { error: "Failed to load books" },
      { status: 500 }
    );
  }

  const bookIndex = new Map(
    (books ?? []).map((book) => [
      book.id,
      {
        name: book.name,
        abbreviation: book.abbreviation,
        order: book.order,
      },
    ])
  );

  const { data: chunks, error: chunksError } = await supabase
    .from("scripture_chunks")
    .select("book_id, chapter, content_json")
    .eq("translation_id", translation.id);

  if (chunksError) {
    return NextResponse.json(
      { error: "Failed to search scripture" },
      { status: 500 }
    );
  }

  const needle = buildSearchNeedle(query);
  const results: BibleSearchResult[] = [];
  let totalMatches = 0;

  for (const chunk of chunks ?? []) {
    const bookInfo = bookIndex.get(chunk.book_id);

    if (!bookInfo) {
      continue;
    }

    const content = chunk.content_json as { verses?: BibleVerse[] } | null;
    if (!Array.isArray(content?.verses)) {
      continue;
    }

    for (const verseCandidate of content.verses) {
      if (!isVerseCandidate(verseCandidate)) {
        continue;
      }

      if (!verseMatchesQuery(verseCandidate, needle)) {
        continue;
      }

      totalMatches += 1;

      if (results.length >= limit) {
        continue;
      }

      results.push(
        toSearchResult(
          chunk.book_id,
          bookInfo.name,
          bookInfo.abbreviation ?? null,
          chunk.chapter,
          verseCandidate
        )
      );
    }
  }

  const sortedResults = results.sort((a, b) => {
    const orderA = bookIndex.get(a.bookId)?.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = bookIndex.get(b.bookId)?.order ?? Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    if (a.chapter !== b.chapter) {
      return a.chapter - b.chapter;
    }

    return a.verse - b.verse;
  });

  const response: BibleSearchResponse = {
    query,
    translation: {
      code: translation.code,
      name: translation.name,
    },
    totalMatches,
    results: sortedResults,
  };

  return NextResponse.json(response);
}
