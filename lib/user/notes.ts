import type { Database } from "@/lib/database.types";
import type { UserNote } from "@/types/user";

export type UserNoteRow = Database["public"]["Tables"]["user_notes"]["Row"];

export const mapNoteRow = (row: UserNoteRow): UserNote => ({
  id: row.id,
  translationId: row.translation_id,
  bookId: row.book_id,
  chapter: row.chapter,
  verseStart: row.verse_start,
  verseEnd: row.verse_end,
  body: row.body,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const sanitiseNoteBody = (body: string) => body.trim();
