"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { parseVerseRangeValue } from "@/lib/bible/verseRange";
import { useBooksQuery, useTranslationsQuery } from "@/lib/query/bible";
import { useCreateMemoryVerseMutation } from "@/lib/query/memory";
import { getUserMemoryVerses } from "@/lib/api/memory";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import { ACTIVE_TRANSLATION_STORAGE_KEY } from "@/lib/translation/cookie";

const normalizeBook = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

export function useAddMemoryVerse(options: {
  book: string;
  chapter: number;
  versesRange: string | null;
  memoryVerse: string;
}) {
  const { book, chapter, versesRange, memoryVerse } = options;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "saving" | "added">("idle");
  const [storedCode, setStoredCode] = useState<string | null>(null);

  useEffect(() => {
    setStoredCode(
      window.localStorage.getItem(ACTIVE_TRANSLATION_STORAGE_KEY),
    );
  }, []);

  const translationsQuery = useTranslationsQuery();
  const preferred =
    translationsQuery.data?.find((entry) => entry.code === storedCode) ??
    translationsQuery.data?.[0] ??
    null;
  const translationCode = preferred?.code ?? null;
  const translationId = preferred?.id ?? null;

  const booksQuery = useBooksQuery(translationCode);
  const books = booksQuery.data ?? [];
  const createMutation = useCreateMemoryVerseMutation(
    translationCode,
    "study-hub",
  );

  const matchingBook = useMemo(() => {
    const target = normalizeBook(book);
    return (
      books.find((entry) => {
        const name = normalizeBook(entry.name);
        const abbrev = entry.abbreviation
          ? normalizeBook(entry.abbreviation)
          : "";
        return name === target || (abbrev.length > 0 && abbrev === target);
      }) ?? null
    );
  }, [book, books]);

  const verseRange = useMemo(() => {
    if (!versesRange?.trim()) {
      return { start: 1, end: 1 };
    }
    return parseVerseRangeValue(versesRange) ?? { start: 1, end: 1 };
  }, [versesRange]);

  const ready =
    !translationsQuery.isLoading &&
    (!translationCode || !booksQuery.isLoading);

  const handleAdd = async () => {
    if (!matchingBook || !translationCode) {
      toast.error("Unable to match this week's book in your translation.");
      return;
    }

    setStatus("saving");
    try {
      const existing = await queryClient.fetchQuery({
        queryKey: queryKeys.userMemory(translationCode),
        queryFn: () => getUserMemoryVerses(translationCode),
        staleTime: STALE_TIMES.user,
      });
      const alreadySaved = existing.some(
        (verse) =>
          verse.bookId === matchingBook.id &&
          verse.chapter === chapter &&
          verse.verseStart === verseRange.start &&
          (verse.verseEnd ?? verse.verseStart) === verseRange.end,
      );

      if (alreadySaved) {
        setStatus("added");
        toast.success("Already in your memory list.");
        return;
      }

      const label = memoryVerse.trim().slice(0, 120) || null;
      await createMutation.mutateAsync({
        translationId: translationId ?? translationCode,
        bookId: matchingBook.id,
        chapter,
        verseStart: verseRange.start,
        verseEnd: verseRange.end,
        label,
        tags: ["weekly-study"],
      });

      setStatus("added");
      toast.success("Added to memory.");
    } catch (error) {
      setStatus("idle");
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to add memory verse.",
      );
    }
  };

  return {
    status,
    ready,
    matchingBook,
    translationCode,
    disabled:
      status === "saving" ||
      status === "added" ||
      !ready ||
      !matchingBook ||
      !translationCode,
    onAdd: handleAdd,
    visible: Boolean(memoryVerse.trim()),
  };
}
