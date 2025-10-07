import { apiFetch } from "./fetch";

import type {
  BibleBookSummary,
  BibleBooksResponse,
  BibleChapterResponse,
  BiblePassageResponse,
  BibleSearchResponse,
  BibleTranslationSummary,
} from "@/types/bible";

export const getTranslations = async () =>
  apiFetch<BibleTranslationSummary[]>("/api/bible/translations");

export const getBooksForTranslation = async (translationCode: string) => {
  const response = await apiFetch<BibleBooksResponse>(
    `/api/bible/books?translation=${encodeURIComponent(translationCode)}`
  );
  return response.books;
};

export const getChapterContent = async (
  translationCode: string,
  bookName: string,
  chapter: number
) =>
  apiFetch<BibleChapterResponse>(
    `/api/bible/${encodeURIComponent(bookName)}/${chapter}?translation=${encodeURIComponent(translationCode)}`
  );

export const getPassage = async (
  translationCode: string,
  bookName: string,
  start: { chapter: number; verse: number },
  end?: { chapter: number; verse: number }
) => {
  const searchParams = new URLSearchParams({
    translation: translationCode,
    book: bookName,
    start: `${start.chapter}:${start.verse}`,
    end: `${(end ?? start).chapter}:${(end ?? start).verse}`,
  });

  return apiFetch<BiblePassageResponse>(`/api/bible/passage?${searchParams.toString()}`);
};

export const searchBible = async (
  translationCode: string,
  query: string,
  limit?: number
) => {
  const params = new URLSearchParams({
    translation: translationCode,
    q: query,
  });

  if (typeof limit === "number") {
    params.set("limit", `${limit}`);
  }

  return apiFetch<BibleSearchResponse>(`/api/bible/search?${params.toString()}`);
};

export type ChapterVerse = {
  chapter: number;
  verse: number;
};

export const buildReferenceLabel = (
  book: BibleBookSummary | undefined,
  chapter: number | null,
  start: number | null,
  end: number | null
) => {
  if (!book || !chapter) {
    return null;
  }

  if (!start) {
    return `${book.name} ${chapter}`;
  }

  if (!end || end === start) {
    return `${book.name} ${chapter}:${start}`;
  }

  return `${book.name} ${chapter}:${start}-${end}`;
};
