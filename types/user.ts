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
export interface UserBookmark {
  /** Unique local or server ID */
  id: string;

  /** Book number or code (e.g., "GEN", "MAT") */
  bookId: string | number;

  /** Chapter number */
  chapter: number;

  /** The logged-in user's ID (from Supabase) */
  user_id?: string;

  /** Optional user note */
  note?: string;

  /** Optional highlight or label color */
  color?: string;

  /** Timestamp when bookmark was created (server-generated preferred) */
  createdAt?: string;

  /** Timestamp when bookmark was last updated */
  updatedAt?: string;
}

export type NoteRouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export interface UpsertUserBookmarkPayload {
  /** Optional: present when updating existing bookmark */
  id?: string;

  /** ID of the user creating/updating this bookmark */
  user_id: string;

  /** Reference to the verse or passage */
  verse_ref: string;

  /** Optional personal note or title */
  note?: string;

  /** Optional highlight color or metadata */
  color?: string;

  /** Timestamps (server-generated preferred) */
  created_at?: string;
  updated_at?: string;
}
