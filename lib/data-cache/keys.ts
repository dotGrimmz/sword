/**
 * @deprecated Prefer `@/lib/query/keys` (`queryKeys` + `STALE_TIMES`).
 * Kept for the deprecated DataCacheProvider evaluation path.
 */
/** Shared stale-time defaults (milliseconds). */
export const STALE_TIMES = {
  user: 1000 * 60 * 5,
  bible: 1000 * 60 * 60,
  profile: 1000 * 60 * 5,
  translations: 1000 * 60 * 10,
} as const;

export const cacheKeys = {
  translations: () => "translations",
  books: (translationCode: string) => `books-${translationCode}`,
  chapter: (translationCode: string, bookName: string, chapter: number) =>
    `chapter-${translationCode}-${bookName}-${chapter}`,
  passage: (
    translationCode: string,
    bookName: string,
    startChapter: number,
    startVerse: number,
    endChapter: number,
    endVerse: number,
  ) =>
    `passage-${translationCode}-${bookName}-${startChapter}:${startVerse}-${endChapter}:${endVerse}`,
  userNotes: (translationCode: string) => `user-notes-${translationCode}`,
  userNotesPreview: (translationCode: string) =>
    `user-notes-preview-${translationCode}`,
  userHighlights: (translationCode: string) => `user-highlights-${translationCode}`,
  userBookmarks: (translationCode: string) => `user-bookmarks-${translationCode}`,
  userMemory: (translationCode: string) => `user-memory-verses-${translationCode}`,
  profile: () => "profile",
} as const;
