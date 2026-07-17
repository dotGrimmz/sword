"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useTranslationContext } from "@/components/TranslationContext";
import { buildReferenceLabel } from "@/lib/api/bible";
import { MEMORY_UPDATED_EVENT } from "@/lib/events";
import type { ReviewRating } from "@/lib/memory/scheduling";
import {
  useCreateMemoryVerseMutation,
  useDeleteMemoryVerseMutation,
  useMemoryVersesQuery,
  useReviewMemoryVerseMutation,
} from "@/lib/query/memory";
import { usePassageTextsMap } from "@/lib/query/passages";
import type { BibleBookSummary } from "@/types/bible";
import type { UserMemoryVerse } from "@/types/user";

export type MemoryVerseViewModel = {
  raw: UserMemoryVerse;
  bookName: string;
  referenceLabel: string | null;
  verseText: string;
  nextReviewLabel: string | null;
};

const formatDate = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatIntervalLabel = (days: number | null | undefined) => {
  if (days === null || days === undefined) return "Scheduled";
  if (!Number.isFinite(days) || days <= 0) return "Later today";
  if (days === 1) return "In 1 day";
  if (days < 7) return `In ${days} days`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `In ${weeks} week${weeks === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  return `In ${months} month${months === 1 ? "" : "s"}`;
};

export function useMemoryScreen(_options?: {
  onNavigate?: (screen: string) => void;
}) {
  const {
    books,
    translation,
    translationCode,
    isLoadingTranslations,
    isLoadingBooks,
  } = useTranslationContext();

  const memoryQuery = useMemoryVersesQuery(translationCode);
  const createMutation = useCreateMemoryVerseMutation(translationCode);
  const deleteMutation = useDeleteMemoryVerseMutation(translationCode);
  const reviewMutation = useReviewMemoryVerseMutation(translationCode);

  const memoryVerses = memoryQuery.data ?? [];

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBookId, setCreateBookId] = useState<string | null>(null);
  const [createChapter, setCreateChapter] = useState("1");
  const [createVerseStart, setCreateVerseStart] = useState("1");
  const [createVerseEnd, setCreateVerseEnd] = useState("1");
  const [createLabel, setCreateLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [initialReviewCount, setInitialReviewCount] = useState(0);

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

  const passageRequests = useMemo(
    () =>
      memoryVerses.map((verse) => {
        const book = verse.bookId ? bookIndex.get(verse.bookId) : undefined;
        return {
          id: verse.id,
          bookName: book?.name,
          chapter: verse.chapter,
          verseStart: verse.verseStart,
          verseEnd: verse.verseEnd,
        };
      }),
    [bookIndex, memoryVerses],
  );

  const verseTexts = usePassageTextsMap(translationCode, passageRequests);

  const resetCreateForm = useCallback(() => {
    const firstBook = books[0]?.id ?? null;
    setCreateBookId(firstBook);
    setCreateChapter("1");
    setCreateVerseStart("1");
    setCreateVerseEnd("1");
    setCreateLabel("");
    setCreateError(null);
  }, [books]);

  useEffect(() => {
    if (isCreateOpen) resetCreateForm();
  }, [isCreateOpen, resetCreateForm]);

  useEffect(() => {
    setCreateVerseEnd((current) => {
      const startValue = Number.parseInt(createVerseStart, 10);
      const endValue = Number.parseInt(current, 10);
      if (!Number.isFinite(startValue)) return current;
      if (!Number.isFinite(endValue) || endValue < startValue) {
        return `${startValue}`;
      }
      return current;
    });
  }, [createVerseStart]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler: EventListener = (event) => {
      const custom = event as CustomEvent<{ source?: string }>;
      if (custom.detail?.source === "memory-screen") return;
      void memoryQuery.refetch();
    };
    window.addEventListener(MEMORY_UPDATED_EVENT, handler);
    return () => window.removeEventListener(MEMORY_UPDATED_EVENT, handler);
  }, [memoryQuery]);

  useEffect(() => {
    if (memoryQuery.isError && memoryQuery.error) {
      toast.error(
        memoryQuery.error instanceof Error
          ? memoryQuery.error.message
          : "Failed to load memory verses",
      );
    }
  }, [memoryQuery.error, memoryQuery.isError]);

  const derivedVerses = useMemo<MemoryVerseViewModel[]>(
    () =>
      memoryVerses.map((verse) => {
        const book = verse.bookId ? bookIndex.get(verse.bookId) : null;
        return {
          raw: verse,
          bookName: book?.name ?? "",
          referenceLabel: buildReferenceLabel(
            book ?? undefined,
            verse.chapter,
            verse.verseStart,
            verse.verseEnd,
          ),
          verseText: verseTexts[verse.id] ?? "",
          nextReviewLabel: formatDate(verse.nextReviewDate),
        };
      }),
    [memoryVerses, bookIndex, verseTexts],
  );

  const filteredVerses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return derivedVerses;
    return derivedVerses.filter(
      (verse) =>
        verse.bookName.toLowerCase().includes(query) ||
        (verse.referenceLabel &&
          verse.referenceLabel.toLowerCase().includes(query)) ||
        verse.verseText.toLowerCase().includes(query),
    );
  }, [derivedVerses, searchQuery]);

  const dueVerses = useMemo(() => {
    const today = new Date();
    return memoryVerses.filter((verse) => {
      if (!verse.nextReviewDate) return true;
      const nextReview = new Date(verse.nextReviewDate);
      if (Number.isNaN(nextReview.getTime())) return true;
      return nextReview <= today;
    });
  }, [memoryVerses]);

  const needsReviewCount = dueVerses.length;
  const activeReview = dueVerses[0] ?? null;
  const activeReviewBook = activeReview?.bookId
    ? bookIndex.get(activeReview.bookId)
    : null;
  const activeReviewReference = activeReview
    ? buildReferenceLabel(
        activeReviewBook ?? undefined,
        activeReview.chapter,
        activeReview.verseStart,
        activeReview.verseEnd,
      )
    : null;
  const activeReviewText = activeReview
    ? (verseTexts[activeReview.id] ?? "")
    : "";

  const averageInterval = useMemo(() => {
    if (memoryVerses.length === 0) return 0;
    const sum = memoryVerses.reduce(
      (acc, verse) => acc + (verse.intervalDays ?? 0),
      0,
    );
    return Math.round(sum / memoryVerses.length);
  }, [memoryVerses]);

  const handleCreate = async () => {
    if (!translationCode) {
      setCreateError("Select a translation before adding memory verses.");
      return;
    }
    if (!createBookId) {
      setCreateError("Choose a book for this verse.");
      return;
    }

    const chapterValue = Number.parseInt(createChapter, 10);
    const verseStartValue = Number.parseInt(createVerseStart, 10);
    const verseEndValue = Number.parseInt(createVerseEnd, 10);

    if (!Number.isFinite(chapterValue) || chapterValue < 1) {
      setCreateError("Chapter must be a positive number.");
      return;
    }
    if (!Number.isFinite(verseStartValue) || verseStartValue < 1) {
      setCreateError("Verse must be a positive number.");
      return;
    }
    if (!Number.isFinite(verseEndValue) || verseEndValue < verseStartValue) {
      setCreateError("Verse range is invalid.");
      return;
    }

    setCreateError(null);
    try {
      await createMutation.mutateAsync({
        translationId: translation?.id ?? translationCode,
        bookId: createBookId,
        chapter: chapterValue,
        verseStart: verseStartValue,
        verseEnd: verseEndValue,
        label: createLabel.trim() || null,
      });
      setIsCreateOpen(false);
      toast.success("Memory verse added");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save memory verse",
      );
    }
  };

  const handleDelete = async (verse: UserMemoryVerse) => {
    try {
      await deleteMutation.mutateAsync(verse);
      toast.success("Memory verse removed");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to remove memory verse",
      );
    }
  };

  const handleOpenReview = useCallback(() => {
    if (dueVerses.length === 0) return;
    setInitialReviewCount(dueVerses.length);
    setIsReviewOpen(true);
  }, [dueVerses.length]);

  const handleReviewOpenChange = useCallback((open: boolean) => {
    setIsReviewOpen(open);
  }, []);

  const handleReviewAction = useCallback(
    async (rating: ReviewRating) => {
      if (!activeReview) return;
      const remainingAfterCurrent = Math.max(0, dueVerses.length - 1);
      try {
        const updated = await reviewMutation.mutateAsync({
          id: activeReview.id,
          rating,
        });
        if (remainingAfterCurrent <= 0) {
          toast.success("You’re all caught up!");
        } else {
          const intervalLabel = formatIntervalLabel(updated.intervalDays);
          const message = activeReviewReference
            ? `${activeReviewReference} — ${intervalLabel}`
            : intervalLabel;
          toast.success(message);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update review schedule",
        );
      }
    },
    [
      activeReview,
      activeReviewReference,
      dueVerses.length,
      reviewMutation,
    ],
  );

  const selectedBook = createBookId ? bookIndex.get(createBookId) : null;
  const chapterCount = selectedBook?.chapters ?? 1;

  const busy =
    isLoadingTranslations ||
    isLoadingBooks ||
    !translationCode ||
    memoryQuery.isLoading;

  return {
    books,
    translationCode,
    busy,
    memoryVerses,
    filteredVerses,
    dueVerses,
    needsReviewCount,
    averageInterval,
    searchQuery,
    setSearchQuery,
    isCreateOpen,
    setIsCreateOpen,
    createBookId,
    setCreateBookId,
    createChapter,
    setCreateChapter,
    createVerseStart,
    setCreateVerseStart,
    createVerseEnd,
    setCreateVerseEnd,
    createLabel,
    setCreateLabel,
    createError,
    isSavingCreate: createMutation.isPending,
    handleCreate,
    handleDelete,
    isReviewOpen,
    handleReviewOpenChange,
    handleOpenReview,
    handleReviewAction,
    isReviewSubmitting: reviewMutation.isPending,
    initialReviewCount,
    activeReview,
    activeReviewReference,
    activeReviewText,
    selectedBook,
    chapterCount,
    formatIntervalLabel,
  };
}
