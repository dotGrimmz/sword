import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchBookByName,
  fetchChapterContent,
  fetchTranslationByCode,
} from "@/lib/bible/queries";
import {
  escapeIlikeValue,
  normaliseBookSlug,
  parsePositiveInteger,
  toTitleCaseBookName,
} from "@/lib/bible/utils";
import type {
  BibleChapterResponse,
  BibleVerse,
  ChapterRouteParams,
} from "@/types/bible";

export async function GET(request: Request, { params }: ChapterRouteParams) {
  const routeParams = await params;

  const url = new URL(request.url);
  const translationCode = url.searchParams.get("translation");

  if (!translationCode) {
    return NextResponse.json(
      { error: "Missing required translation query parameter" },
      { status: 400 }
    );
  }

  const chapterNumber = parsePositiveInteger(routeParams.chapter);

  if (chapterNumber === null) {
    return NextResponse.json(
      { error: "Chapter must be a positive integer" },
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

  const normalisedBook = normaliseBookSlug(decodeURIComponent(routeParams.book));

  if (!normalisedBook) {
    return NextResponse.json(
      { error: "Book must be provided" },
      { status: 400 }
    );
  }

  const bookNameMatch = toTitleCaseBookName(normalisedBook);
  const pattern = escapeIlikeValue(bookNameMatch);

  const {
    data: book,
    error: bookError,
  } = await fetchBookByName(supabase, translation.id, pattern);

  if (bookError) {
    return NextResponse.json(
      { error: "Failed to look up book" },
      { status: 500 }
    );
  }

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (book.chapters < chapterNumber) {
    return NextResponse.json(
      { error: "Requested chapter exceeds book length" },
      { status: 404 }
    );
  }

  const {
    data: chunk,
    error: chunkError,
  } = await fetchChapterContent(supabase, translation.id, book.id, chapterNumber);

  if (chunkError) {
    return NextResponse.json(
      { error: "Failed to load chapter" },
      { status: 500 }
    );
  }

  if (!chunk) {
    return NextResponse.json(
      { error: "Chapter not found" },
      { status: 404 }
    );
  }

  const content = chunk.content_json as { verses?: BibleVerse[] } | null;
  const verses = Array.isArray(content?.verses)
    ? content!.verses.filter(
        (entry): entry is BibleVerse =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.verse === "number" &&
          typeof entry.text === "string"
      )
    : [];

  const response: BibleChapterResponse = {
    translation: {
      code: translation.code,
      name: translation.name,
    },
    book: {
      id: book.id,
      name: book.name,
      abbreviation: book.abbreviation,
      chapters: book.chapters,
    },
    chapter: chapterNumber,
    verses,
  };

  return NextResponse.json(response);
}
