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
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getBooksForTranslation,
  getTranslations,
} from "@/lib/api/bible";
import { getUserNotes } from "@/lib/api/notes";
import { getUserHighlights } from "@/lib/api/highlights";
import { getUserMemoryVerses } from "@/lib/api/memory";
import { getUserBookmarks } from "@/lib/api/bookmarks";
import type { BibleBookSummary, BibleTranslationSummary } from "@/types/bible";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import {
  ACTIVE_TRANSLATION_COOKIE,
  ACTIVE_TRANSLATION_STORAGE_KEY,
} from "@/lib/translation/cookie";

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

const STORAGE_KEY = ACTIVE_TRANSLATION_STORAGE_KEY;

const persistTranslationPreference = (code: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, code);
  document.cookie = `${ACTIVE_TRANSLATION_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=31536000; samesite=lax`;
};

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
  const [translationCode, setTranslationCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const selectTranslation = useCallback((code: string) => {
    setTranslationCode(code);
    persistTranslationPreference(code);
  }, []);

  const {
    data: translationsData = [],
    isLoading: isLoadingTranslations,
    error: translationsErrorValue,
    refetch: refetchTranslations,
  } = useQuery({
    queryKey: queryKeys.translations(),
    queryFn: getTranslations,
    staleTime: STALE_TIMES.translations,
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
  } = useQuery({
    queryKey: queryKeys.books(translationCode ?? "none"),
    queryFn: () => getBooksForTranslation(translationCode as string),
    staleTime: STALE_TIMES.user,
    enabled: Boolean(translationCode),
  });

  const books = useMemo(
    () => (translationCode ? booksData : []),
    [booksData, translationCode],
  );

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
        persistTranslationPreference(stored);
        return stored;
      }

      const fallback = translations[0]?.code ?? null;
      if (fallback) {
        persistTranslationPreference(fallback);
      }
      return fallback;
    });
  }, [translations]);

  const translation = useMemo(
    () => translations.find((item) => item.code === translationCode) ?? null,
    [translations, translationCode],
  );

  useEffect(() => {
    if (!translationCode) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: queryKeys.userNotesPreview(translationCode),
      queryFn: () => getUserNotes(10, translationCode),
      staleTime: STALE_TIMES.user,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.userNotes(translationCode),
      queryFn: () => getUserNotes(undefined, translationCode),
      staleTime: STALE_TIMES.user,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.userHighlights(translationCode),
      queryFn: () => getUserHighlights(translationCode),
      staleTime: STALE_TIMES.user,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.userMemory(translationCode),
      queryFn: () => getUserMemoryVerses(translationCode),
      staleTime: STALE_TIMES.user,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.userBookmarks(translationCode),
      queryFn: () => getUserBookmarks(translationCode),
      staleTime: STALE_TIMES.user,
    });
  }, [queryClient, translationCode]);

  const refreshBooks = useCallback(async () => {
    if (!translationCode) {
      return;
    }
    await refetchBooksQuery();
  }, [refetchBooksQuery, translationCode]);

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
      refreshTranslations,
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
      refreshTranslations,
      refreshBooks,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = getInitialStoredTranslation();
    if (stored) {
      setTranslationCode(stored);
    }
  }, []);

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
