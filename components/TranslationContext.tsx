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
import { useDataQuery } from "@/lib/data-cache/DataCacheProvider";

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
  const [translationCode, setTranslationCode] = useState<string | null>(() => getInitialStoredTranslation());

  const selectTranslation = useCallback((code: string) => {
    setTranslationCode(code);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  const {
    data: translationsData = [],
    isLoading: isLoadingTranslations,
    error: translationsErrorValue,
    refetch: refetchTranslations,
  } = useDataQuery<BibleTranslationSummary[]>("translations", getTranslations, {
    staleTime: 1000 * 60 * 10,
  });

  const translations = translationsData;

  const translationsError = translationsErrorValue
    ? translationsErrorValue instanceof Error
      ? translationsErrorValue.message
      : String(translationsErrorValue)
    : null;

  const {
    data: booksData = [],
    isLoading: isLoadingBooks,
    error: booksErrorValue,
    refetch: refetchBooksQuery,
  } = useDataQuery<BibleBookSummary[]>(
    `books-${translationCode ?? "none"}`,
    () => getBooksForTranslation(translationCode as string),
    {
      staleTime: 1000 * 60 * 5,
      enabled: Boolean(translationCode),
    },
  );

  const books = useMemo(() => (translationCode ? booksData : []), [booksData, translationCode]);

  const booksError = booksErrorValue
    ? booksErrorValue instanceof Error
      ? booksErrorValue.message
      : String(booksErrorValue)
    : null;

  const refreshTranslations = useCallback(async () => {
    await refetchTranslations();
  }, [refetchTranslations]);

  useEffect(() => {
    if (translations.length === 0) {
      setTranslationCode(null);
      return;
    }

    setTranslationCode((existing) => {
      if (existing && translations.some((item) => item.code === existing)) {
        return existing;
      }

      const stored = getInitialStoredTranslation();
      if (stored && translations.some((item) => item.code === stored)) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, stored);
        }
        return stored;
      }

      const fallback = translations[0]?.code ?? null;
      if (fallback && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, fallback);
      }
      return fallback;
    });
  }, [translations]);

  const translation = useMemo(
    () => translations.find((item) => item.code === translationCode) ?? null,
    [translations, translationCode]
  );

  const refreshBooks = useCallback(async () => {
    if (!translationCode) {
      return;
    }
    await refetchBooksQuery();
  }, [refetchBooksQuery, translationCode]);

  const contextValue = useMemo<TranslationContextValue>(() => ({
    translations,
    translation,
    translationCode,
    books,
    isLoadingTranslations,
    isLoadingBooks,
    error: translationsError ?? booksError,
    selectTranslation,
    refreshTranslations,
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
    refreshTranslations,
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
