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

export type NoteRouteParams = {
  params: Promise<{
    id: string;
  }>;
};
