import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchBookByName,
  fetchTranslationByCode,
} from "@/lib/bible/queries";
import {
  escapeIlikeValue,
  normaliseBookSlug,
  parsePositiveInteger,
  toTitleCaseBookName,
} from "@/lib/bible/utils";
import type { BiblePassageResponse, BiblePassageVerse } from "@/types/bible";

const parseReference = (
  value: string | null,
  paramName: string
): { data: { chapter: number; verse: number } } | { error: string } => {
  if (!value) {
    return { error: `${paramName} parameter is required` };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { error: `${paramName} parameter cannot be empty` };
  }

  const parts = trimmed.split(":");

  if (parts.length !== 2) {
    return { error: `${paramName} must be in the format chapter:verse` };
  }

  const [rawChapter, rawVerse] = parts;
  const chapter = parsePositiveInteger(rawChapter);

  if (chapter === null) {
    return { error: `${paramName} chapter must be a positive integer` };
  }

  const verse = parsePositiveInteger(rawVerse);

  if (verse === null) {
    return { error: `${paramName} verse must be a positive integer` };
  }

  return { data: { chapter, verse } };
};

const isReferenceBeforeOrEqual = (
  left: { chapter: number; verse: number },
  right: { chapter: number; verse: number }
) =>
  left.chapter < right.chapter ||
  (left.chapter === right.chapter && left.verse <= right.verse);

const buildRangeVerses = (
  chunks: Array<{ chapter: number; content_json: unknown }>,
  start: { chapter: number; verse: number },
  end: { chapter: number; verse: number }
): BiblePassageVerse[] => {
  const verses: BiblePassageVerse[] = [];

  for (const chunk of chunks) {
    const chapterNumber = chunk.chapter;

    if (chapterNumber < start.chapter || chapterNumber > end.chapter) {
      continue;
    }

    const content = chunk.content_json as { verses?: { verse: number; text: string }[] } | null;
    const chapterVerses = Array.isArray(content?.verses)
      ? content!.verses.filter(
          (entry): entry is { verse: number; text: string } =>
            typeof entry === "object" &&
            entry !== null &&
            typeof entry.verse === "number" &&
            typeof entry.text === "string"
        )
      : [];

    for (const verseEntry of chapterVerses) {
      if (verseEntry.verse < 1) {
        continue;
      }

      if (chapterNumber === start.chapter && verseEntry.verse < start.verse) {
        continue;
      }

      if (chapterNumber === end.chapter && verseEntry.verse > end.verse) {
        continue;
      }

      verses.push({
        chapter: chapterNumber,
        verse: verseEntry.verse,
        text: verseEntry.text,
      });
    }
  }

  return verses;
};

export async function GET(request: Request) {
  const url = new URL(request.url);

  const translationCode = url.searchParams.get("translation");
  if (!translationCode) {
    return NextResponse.json(
      { error: "Missing required translation query parameter" },
      { status: 400 }
    );
  }

  const bookParam = url.searchParams.get("book");
  if (!bookParam || bookParam.trim().length === 0) {
    return NextResponse.json(
      { error: "book parameter is required" },
      { status: 400 }
    );
  }

  const startValidation = parseReference(url.searchParams.get("start"), "start");
  if ("error" in startValidation) {
    return NextResponse.json({ error: startValidation.error }, { status: 400 });
  }

  const endValidation = parseReference(
    url.searchParams.get("end") ?? url.searchParams.get("start"),
    "end"
  );
  if ("error" in endValidation) {
    return NextResponse.json({ error: endValidation.error }, { status: 400 });
  }

  const startRef = startValidation.data;
  const endRef = endValidation.data;

  if (!isReferenceBeforeOrEqual(startRef, endRef)) {
    return NextResponse.json(
      { error: "start reference must be before or equal to end reference" },
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
    return NextResponse.json({ error: "Translation not found" }, { status: 404 });
  }

  const normalisedBook = normaliseBookSlug(decodeURIComponent(bookParam));

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

  if (startRef.chapter > book.chapters || endRef.chapter > book.chapters) {
    return NextResponse.json(
      { error: "Requested chapter exceeds book length" },
      { status: 404 }
    );
  }

  const {
    data: chunks,
    error: chunksError,
  } = await supabase
    .from("scripture_chunks")
    .select("chapter, content_json")
    .eq("translation_id", translation.id)
    .eq("book_id", book.id)
    .gte("chapter", startRef.chapter)
    .lte("chapter", endRef.chapter)
    .order("chapter", { ascending: true });

  if (chunksError) {
    return NextResponse.json(
      { error: "Failed to load passage", message: chunksError.message },
      { status: 500 }
    );
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json(
      { error: "Passage not found" },
      { status: 404 }
    );
  }

  const requiredChapterCount = endRef.chapter - startRef.chapter + 1;
  if (chunks.length !== requiredChapterCount) {
    return NextResponse.json(
      { error: "Passage not found" },
      { status: 404 }
    );
  }

  const verses = buildRangeVerses(chunks, startRef, endRef);

  if (verses.length === 0) {
    return NextResponse.json(
      { error: "Passage not found" },
      { status: 404 }
    );
  }

  const hasStartVerse = verses.some(
    (entry) => entry.chapter === startRef.chapter && entry.verse === startRef.verse
  );
  const hasEndVerse = verses.some(
    (entry) => entry.chapter === endRef.chapter && entry.verse === endRef.verse
  );

  if (!hasStartVerse || !hasEndVerse) {
    return NextResponse.json(
      { error: "Specified verse range not available" },
      { status: 404 }
    );
  }

  const response: BiblePassageResponse = {
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
    range: {
      start: startRef,
      end: endRef,
    },
    verses,
  };

  return NextResponse.json(response);
}
