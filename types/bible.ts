export type BibleTranslationSummary = {
  code: string;
  name: string;
  language: string | null;
  version: string | null;
};

export type BibleTranslation = BibleTranslationSummary & {
  id: string;
};

export type BibleBookSummary = {
  id: string;
  name: string;
  abbreviation: string | null;
  chapters: number;
  order: number;
};

export type BibleBookPreview = Pick<BibleBookSummary, "id" | "name" | "chapters">;

export type BibleVerse = {
  verse: number;
  text: string;
};

export type BibleBooksResponse = {
  translation: {
    code: string;
    name: string;
  };
  books: BibleBookSummary[];
};

export type BibleChapterResponse = {
  translation: {
    code: string;
    name: string;
  };
  book: {
    id: string;
    name: string;
    abbreviation: string | null;
    chapters: number;
  };
  chapter: number;
  verses: BibleVerse[];
};

export type ChapterRouteParams = {
  params: Promise<{
    book: string;
    chapter: string;
  }>;
};

export type BibleSearchResult = {
  bookId: string;
  bookName: string;
  bookAbbreviation: string | null;
  chapter: number;
  verse: number;
  text: string;
};

export type BibleSearchResponse = {
  query: string;
  translation: {
    code: string;
    name: string;
  };
  totalMatches: number;
  results: BibleSearchResult[];
};
