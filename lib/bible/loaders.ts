import {
  fetchBookByName,
  fetchBooksForTranslation,
  fetchChapterContent,
  fetchTranslationByCode,
  type SupabaseDbClient,
} from "@/lib/bible/queries";
import {
  escapeIlikeValue,
  normaliseBookSlug,
  toTitleCaseBookName,
} from "@/lib/bible/utils";
import type {
  BibleBookSummary,
  BibleBooksResponse,
  BibleChapterResponse,
  BiblePassageResponse,
  BiblePassageVerse,
  BibleTranslationSummary,
  BibleVerse,
} from "@/types/bible";

export class BibleLoaderError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "BibleLoaderError";
    this.status = status;
  }
}

export async function fetchTranslations(
  client: SupabaseDbClient,
): Promise<BibleTranslationSummary[]> {
  const { data, error } = await client
    .from("bible_translations")
    .select("id, code, name, language, version")
    .order("code", { ascending: true });

  if (error) {
    throw new BibleLoaderError("Failed to load translations", 500);
  }

  return (data ?? []) as BibleTranslationSummary[];
}

export async function fetchBooksForTranslationCode(
  client: SupabaseDbClient,
  translationCode: string,
): Promise<BibleBooksResponse> {
  const {
    data: translation,
    error: translationError,
  } = await fetchTranslationByCode(client, translationCode);

  if (translationError) {
    throw new BibleLoaderError("Failed to look up translation", 500);
  }

  if (!translation) {
    throw new BibleLoaderError("Translation not found", 404);
  }

  const { data: books, error: booksError } = await fetchBooksForTranslation(
    client,
    translation.id,
  );

  if (booksError) {
    throw new BibleLoaderError("Failed to load books", 500);
  }

  const booksPayload = ((books ?? []) as {
    id: string;
    name: string;
    abbreviation: string | null;
    chapters: number;
    order_index: number;
  }[]).map<BibleBookSummary>((book) => ({
    id: book.id,
    name: book.name,
    abbreviation: book.abbreviation,
    chapters: book.chapters,
    order: book.order_index,
  }));

  return {
    translation: {
      code: translation.code,
      name: translation.name,
    },
    books: booksPayload,
  };
}

const resolveBook = async (
  client: SupabaseDbClient,
  translationId: string,
  bookParam: string,
) => {
  const normalisedBook = normaliseBookSlug(decodeURIComponent(bookParam));
  if (!normalisedBook) {
    throw new BibleLoaderError("Book must be provided", 400);
  }

  const bookNameMatch = toTitleCaseBookName(normalisedBook);
  const pattern = escapeIlikeValue(bookNameMatch);
  const { data: book, error: bookError } = await fetchBookByName(
    client,
    translationId,
    pattern,
  );

  if (bookError) {
    throw new BibleLoaderError("Failed to look up book", 500);
  }

  if (!book) {
    throw new BibleLoaderError("Book not found", 404);
  }

  return book;
};

export async function fetchChapterDto(
  client: SupabaseDbClient,
  translationCode: string,
  bookName: string,
  chapterNumber: number,
): Promise<BibleChapterResponse> {
  const {
    data: translation,
    error: translationError,
  } = await fetchTranslationByCode(client, translationCode);

  if (translationError) {
    throw new BibleLoaderError("Failed to look up translation", 500);
  }

  if (!translation) {
    throw new BibleLoaderError("Translation not found", 404);
  }

  const book = await resolveBook(client, translation.id, bookName);

  if (book.chapters < chapterNumber) {
    throw new BibleLoaderError("Requested chapter exceeds book length", 404);
  }

  const { data: chunk, error: chunkError } = await fetchChapterContent(
    client,
    translation.id,
    book.id,
    chapterNumber,
  );

  if (chunkError) {
    throw new BibleLoaderError("Failed to load chapter", 500);
  }

  if (!chunk) {
    throw new BibleLoaderError("Chapter not found", 404);
  }

  const content = chunk.content_json as { verses?: BibleVerse[] } | null;
  const verses = Array.isArray(content?.verses)
    ? content!.verses.filter(
        (entry): entry is BibleVerse =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.verse === "number" &&
          typeof entry.text === "string",
      )
    : [];

  return {
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
}

const buildRangeVerses = (
  chunks: Array<{ chapter: number; content_json: unknown }>,
  start: { chapter: number; verse: number },
  end: { chapter: number; verse: number },
): BiblePassageVerse[] => {
  const verses: BiblePassageVerse[] = [];

  for (const chunk of chunks) {
    const chapterNumber = chunk.chapter;

    if (chapterNumber < start.chapter || chapterNumber > end.chapter) {
      continue;
    }

    const content = chunk.content_json as {
      verses?: { verse: number; text: string }[];
    } | null;
    const chapterVerses = Array.isArray(content?.verses)
      ? content!.verses.filter(
          (entry): entry is { verse: number; text: string } =>
            typeof entry === "object" &&
            entry !== null &&
            typeof entry.verse === "number" &&
            typeof entry.text === "string",
        )
      : [];

    for (const verseEntry of chapterVerses) {
      if (verseEntry.verse < 1) continue;
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

export async function fetchPassageDto(
  client: SupabaseDbClient,
  translationCode: string,
  bookName: string,
  start: { chapter: number; verse: number },
  end: { chapter: number; verse: number },
): Promise<BiblePassageResponse> {
  const {
    data: translation,
    error: translationError,
  } = await fetchTranslationByCode(client, translationCode);

  if (translationError) {
    throw new BibleLoaderError("Failed to look up translation", 500);
  }

  if (!translation) {
    throw new BibleLoaderError("Translation not found", 404);
  }

  const book = await resolveBook(client, translation.id, bookName);

  if (start.chapter > book.chapters || end.chapter > book.chapters) {
    throw new BibleLoaderError("Requested chapter exceeds book length", 404);
  }

  const { data: chunks, error: chunksError } = await client
    .from("scripture_chunks")
    .select("chapter, content_json")
    .eq("translation_id", translation.id)
    .eq("book_id", book.id)
    .gte("chapter", start.chapter)
    .lte("chapter", end.chapter)
    .order("chapter", { ascending: true });

  if (chunksError) {
    throw new BibleLoaderError(
      chunksError.message || "Failed to load passage",
      500,
    );
  }

  if (!chunks || chunks.length === 0) {
    throw new BibleLoaderError("Passage not found", 404);
  }

  const requiredChapterCount = end.chapter - start.chapter + 1;
  if (chunks.length !== requiredChapterCount) {
    throw new BibleLoaderError("Passage not found", 404);
  }

  const verses = buildRangeVerses(chunks, start, end);

  if (verses.length === 0) {
    throw new BibleLoaderError("Passage not found", 404);
  }

  const hasStartVerse = verses.some(
    (entry) => entry.chapter === start.chapter && entry.verse === start.verse,
  );
  const hasEndVerse = verses.some(
    (entry) => entry.chapter === end.chapter && entry.verse === end.verse,
  );

  if (!hasStartVerse || !hasEndVerse) {
    throw new BibleLoaderError("Specified verse range not available", 404);
  }

  return {
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
    range: { start, end },
    verses,
  };
}
