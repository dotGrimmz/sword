export type UserNote = {
  id: string;
  translationId: string | null;
  bookId: string | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateUserNotePayload = {
  translationId?: string | null;
  bookId?: string | null;
  chapter?: number | null;
  verseStart?: number | null;
  verseEnd?: number | null;
  body: string;
};

export type UpdateUserNotePayload = {
  body: string;
};

export type UserHighlight = {
  id: string;
  bookId: string | null;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  color: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type UserMemoryVerse = {
  id: string;
  bookId: string | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  ease: number | null;
  intervalDays: number | null;
  nextReviewDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  label: string | null;
  tags: string[] | null;
};

export type UserBookmark = {
  id: string;
  bookId: string | null;
  chapter: number | null;
  verse: number | null;
  label: string | null;
  createdAt: string | null;
};

export type NoteRouteParams = {
  params: Promise<{
    id: string;
  }>;
};
