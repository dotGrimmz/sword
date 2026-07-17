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
  audioStoragePath: row.audio_storage_path,
  audioMimeType: row.audio_mime_type,
  audioByteSize: row.audio_byte_size,
  audioDurationMs: row.audio_duration_ms,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const sanitiseNoteBody = (body: string | null | undefined) =>
  (body ?? "").trim();

export const NOTE_SELECT_COLUMNS =
  "id, user_id, translation_id, book_id, chapter, verse_start, verse_end, body, audio_storage_path, audio_mime_type, audio_byte_size, audio_duration_ms, created_at, updated_at";
