"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useOfflineContext } from "./OfflineProvider";
import { getBooksForTranslation, getTranslations } from "@/lib/api/bible";
import { useOfflineStore } from "@/lib/hooks/useOfflineStore";
import type { BibleBookSummary, BibleTranslationSummary } from "@/types/bible";

type TranslationContextValue = {
  translations: BibleTranslationSummary[];
  translation: BibleTranslationSummary | null;
  translationCode: string | null;
  books: BibleBookSummary[];
  isLoadingTranslations: boolean;
  isLoadingBooks: boolean;
  error: string | null;
  selectTranslation: (code: string) => void;
  refreshTranslations: () => Promise<void>;
  refreshBooks: () => Promise<void>;
};

const TranslationContext = createContext<TranslationContextValue | undefined>(
  undefined
);

const TRANSLATIONS_NAMESPACE = "bible_translations";
const BOOKS_NAMESPACE = "bible_books";

const STORAGE_KEY = "sword-active-translation";

const getInitialStoredTranslation = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && stored.length > 0 ? stored : null;
};

interface TranslationProviderProps {
  children: ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const { isOnline, isReady: isOfflineReady } = useOfflineContext();
  const {
    packs: translationPacks,
    savePack: saveTranslationPack,
    loadPack: loadTranslationPack,
    refresh: refreshTranslationsFromCache,
  } = useOfflineStore<BibleTranslationSummary[]>(TRANSLATIONS_NAMESPACE);
  const {
    packs: bookPacks,
    savePack: saveBookPack,
    loadPack: loadBookPack,
    refresh: refreshBooksFromCache,
  } = useOfflineStore<BibleBookSummary[]>(BOOKS_NAMESPACE);
  const [translations, setTranslations] = useState<BibleTranslationSummary[]>(
    []
  );
  const [translationCode, setTranslationCode] = useState<string | null>(null);
  const [books, setBooks] = useState<BibleBookSummary[]>([]);
  const [translationsError, setTranslationsError] = useState<string | null>(
    null
  );
  const [booksError, setBooksError] = useState<string | null>(null);
  const [isLoadingTranslations, setIsLoadingTranslations] = useState(true);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  const selectTranslation = useCallback((code: string) => {
    setTranslationCode(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  const loadBooks = useCallback(
    async (code: string) => {
      if (!isOfflineReady) return;

      setIsLoadingBooks(true);
      setBooksError(null);
      try {
        if (isOnline) {
          const fetchedBooks = await getBooksForTranslation(code);
          // Version should come from manifest
          await saveBookPack(code, fetchedBooks, "1.0.0");
          setBooks(fetchedBooks);
        } else {
          const cached = await loadBookPack(code);
          setBooks(cached?.data ?? []);
          if (!cached) {
            setBooksError(
              "This translation's books are not available offline."
            );
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load books";
        setBooksError(message);
        // Fallback to cache on error
        const cached = await loadBookPack(code);
        setBooks(cached?.data ?? []);
      } finally {
        setIsLoadingBooks(false);
      }
    },
    [isOnline, isOfflineReady, saveBookPack, loadBookPack]
  );

  const loadTranslations = useCallback(async () => {
    if (!isOfflineReady) return;

    setIsLoadingTranslations(true);
    setTranslationsError(null);
    try {
      let fetchedTranslations: BibleTranslationSummary[] = [];
      if (isOnline) {
        fetchedTranslations = await getTranslations();
        // Version should come from manifest
        await saveTranslationPack("list", fetchedTranslations, "1.0.0");
        setTranslations(fetchedTranslations);
      } else {
        const cached = await loadTranslationPack("list");
        fetchedTranslations = cached?.data ?? [];
        setTranslations(fetchedTranslations);
      }

      if (fetchedTranslations.length === 0) {
        setTranslationCode(null);
        setBooks([]);
        return;
      }

      const stored = getInitialStoredTranslation();
      const initialSelection =
        stored && fetchedTranslations.some((item) => item.code === stored)
          ? stored
          : fetchedTranslations[0]?.code ?? null;

      if (initialSelection) {
        setTranslationCode((existing) => existing ?? initialSelection);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, initialSelection);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load translations";
      setTranslationsError(message);
      setTranslations([]);
      // Fallback to cache on error
      const cached = await loadTranslationPack("list");
      setTranslations(cached?.data ?? []);
    } finally {
      setIsLoadingTranslations(false);
    }
  }, [isOnline, isOfflineReady, saveTranslationPack, loadTranslationPack]);

  useEffect(() => {
    void loadTranslations();
    // Run once when offline system is ready
  }, [isOfflineReady, loadTranslations]);

  useEffect(() => {
    if (!translationCode) {
      setBooks([]);
      return;
    }
    void loadBooks(translationCode);
  }, [translationCode, loadBooks]);

  const translation = useMemo(
    () => translations.find((item) => item.code === translationCode) ?? null,
    [translations, translationCode]
  );

  const refreshBooks = useCallback(async () => {
    if (!translationCode) {
      return;
    }
    await loadBooks(translationCode);
  }, [translationCode, loadBooks]);

  const contextValue = useMemo<TranslationContextValue>(
    () => ({
      translations,
      translation,
      translationCode,
      books,
      isLoadingTranslations,
      isLoadingBooks,
      error: translationsError ?? booksError,
      selectTranslation,
      refreshTranslations: loadTranslations,
      refreshBooks,
    }),
    [
      translations,
      translation,
      translationCode,
      books,
      isLoadingTranslations,
      isLoadingBooks,
      translationsError,
      booksError,
      selectTranslation,
      loadTranslations,
      refreshBooks,
    ]
  );

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error(
      "useTranslationContext must be used within a TranslationProvider"
    );
  }
  return context;
}
