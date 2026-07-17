"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getBooksForTranslation,
  getChapterContent,
  getTranslations,
} from "@/lib/api/bible";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

export const useTranslationsQuery = () =>
  useQuery({
    queryKey: queryKeys.translations(),
    queryFn: getTranslations,
    staleTime: STALE_TIMES.translations,
  });

export const useBooksQuery = (translationCode: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.books(translationCode ?? "none"),
    queryFn: () => getBooksForTranslation(translationCode!),
    staleTime: STALE_TIMES.bible,
    enabled: Boolean(translationCode),
  });

export const useChapterQuery = (
  translationCode: string | null | undefined,
  bookName: string | null | undefined,
  chapter: number,
) =>
  useQuery({
    queryKey: queryKeys.chapter(
      translationCode ?? "none",
      bookName ?? "none",
      chapter,
    ),
    queryFn: async () => {
      const response = await getChapterContent(
        translationCode!,
        bookName!,
        chapter,
      );
      return response.verses;
    },
    staleTime: STALE_TIMES.bible,
    enabled: Boolean(translationCode && bookName && chapter >= 1),
  });
