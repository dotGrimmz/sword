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

import {
  getBooksForTranslation,
  getTranslations,
} from "@/lib/api/bible";
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

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

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
  const [translations, setTranslations] = useState<BibleTranslationSummary[]>([]);
  const [translationCode, setTranslationCode] = useState<string | null>(null);
  const [books, setBooks] = useState<BibleBookSummary[]>([]);
  const [translationsError, setTranslationsError] = useState<string | null>(null);
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
      setIsLoadingBooks(true);
      setBooksError(null);
      try {
        const fetchedBooks = await getBooksForTranslation(code);
        setBooks(fetchedBooks);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load books";
        setBooksError(message);
        setBooks([]);
      } finally {
        setIsLoadingBooks(false);
      }
    },
    []
  );

  const loadTranslations = useCallback(async () => {
    setIsLoadingTranslations(true);
    setTranslationsError(null);
    try {
      const fetchedTranslations = await getTranslations();
      setTranslations(fetchedTranslations);

      if (fetchedTranslations.length === 0) {
        setTranslationCode(null);
        setBooks([]);
        return;
      }

      const stored = getInitialStoredTranslation();
      const initialSelection = stored && fetchedTranslations.some((item) => item.code === stored)
        ? stored
        : fetchedTranslations[0]?.code ?? null;

      if (initialSelection) {
        setTranslationCode((existing) => existing ?? initialSelection);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, initialSelection);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load translations";
      setTranslationsError(message);
      setTranslations([]);
      setTranslationCode(null);
      setBooks([]);
    } finally {
      setIsLoadingTranslations(false);
    }
  }, []);

  useEffect(() => {
    void loadTranslations();
  }, [loadTranslations]);

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

  const contextValue = useMemo<TranslationContextValue>(() => ({
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
  }), [
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
  ]);

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslationContext() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslationContext must be used within a TranslationProvider");
  }
  return context;
}
