import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const STORAGE_KEY = "sword-reader-state";

export type ReaderPosition = {
  bookId: string | null;
  chapter: number;
};

type ReaderState = ReaderPosition & {
  selectedVerse: number;
  /** True once persist middleware has rehydrated from localStorage. */
  _hasHydrated: boolean;
  setBookId: (bookId: string | null) => void;
  setChapter: (chapter: number) => void;
  setSelectedVerse: (verse: number) => void;
  /** Atomically update book + chapter (resets verse to 1). */
  setPosition: (bookId: string | null, chapter: number) => void;
  /** Apply deep-link query params — takes precedence over stored position. */
  applyFromQuery: (bookId: string, chapter: number) => void;
  /** Move to the previous chapter or book in the canon list. */
  goToPrevious: (books: Array<{ id: string; chapters: number }>, currentBookId: string) => void;
  /** Move to the next chapter or book in the canon list. */
  goToNext: (books: Array<{ id: string; chapters: number }>, currentBookId: string) => void;
  markHydrated: () => void;
};

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      bookId: null,
      chapter: 1,
      selectedVerse: 1,
      _hasHydrated: false,

      setBookId: (bookId) => set({ bookId }),

      setChapter: (chapter) => set({ chapter }),

      setSelectedVerse: (selectedVerse) => set({ selectedVerse }),

      setPosition: (bookId, chapter) =>
        set({ bookId, chapter, selectedVerse: 1 }),

      applyFromQuery: (bookId, chapter) =>
        set({ bookId, chapter, selectedVerse: 1 }),

      goToPrevious: (books, currentBookId) => {
        const { chapter } = get();
        const currentBook = books.find((book) => book.id === currentBookId);
        if (!currentBook) return;

        if (chapter > 1) {
          set({ chapter: chapter - 1, selectedVerse: 1 });
          return;
        }

        const currentIndex = books.findIndex((book) => book.id === currentBookId);
        if (currentIndex > 0) {
          const previousBook = books[currentIndex - 1]!;
          set({
            bookId: previousBook.id,
            chapter: previousBook.chapters,
            selectedVerse: 1,
          });
        }
      },

      goToNext: (books, currentBookId) => {
        const { chapter } = get();
        const currentBook = books.find((book) => book.id === currentBookId);
        if (!currentBook) return;

        if (chapter < currentBook.chapters) {
          set({ chapter: chapter + 1, selectedVerse: 1 });
          return;
        }

        const currentIndex = books.findIndex((book) => book.id === currentBookId);
        if (currentIndex >= 0 && currentIndex < books.length - 1) {
          const nextBook = books[currentIndex + 1]!;
          set({ bookId: nextBook.id, chapter: 1, selectedVerse: 1 });
        }
      },

      markHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bookId: state.bookId,
        chapter: state.chapter,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("[reader-store] Failed to rehydrate", error);
        }
        state?.markHydrated();
      },
    },
  ),
);

/** Selector hook — only re-renders when reading position changes. */
export const useReaderPosition = () =>
  useReaderStore((state) => ({
    bookId: state.bookId,
    chapter: state.chapter,
    selectedVerse: state.selectedVerse,
    hasHydrated: state._hasHydrated,
  }));
