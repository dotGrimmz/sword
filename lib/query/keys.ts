/** Shared stale-time defaults (milliseconds). */
export const STALE_TIMES = {
  user: 1000 * 60 * 5,
  bible: 1000 * 60 * 60,
  profile: 1000 * 60 * 5,
  translations: 1000 * 60 * 10,
} as const;

/** TanStack Query keys — use these with useQuery / prefetchQuery / setQueryData. */
export const queryKeys = {
  translations: () => ["translations"] as const,
  books: (translationCode: string) => ["books", translationCode] as const,
  chapter: (translationCode: string, bookName: string, chapter: number) =>
    ["chapter", translationCode, bookName, chapter] as const,
  passage: (
    translationCode: string,
    bookName: string,
    startChapter: number,
    startVerse: number,
    endChapter: number,
    endVerse: number,
  ) =>
    [
      "passage",
      translationCode,
      bookName,
      startChapter,
      startVerse,
      endChapter,
      endVerse,
    ] as const,
  userNotes: (translationCode: string) =>
    ["user-notes", translationCode] as const,
  userNotesPreview: (translationCode: string) =>
    ["user-notes-preview", translationCode] as const,
  userHighlights: (translationCode: string) =>
    ["user-highlights", translationCode] as const,
  userBookmarks: (translationCode: string) =>
    ["user-bookmarks", translationCode] as const,
  userMemory: (translationCode: string) =>
    ["user-memory-verses", translationCode] as const,
  profile: () => ["profile"] as const,
} as const;
