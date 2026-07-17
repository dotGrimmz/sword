"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { Book, BookOpen, Heart, Lightbulb } from "lucide-react";
import { useRouter } from "next/navigation";

import { useProfile } from "@/components/ProfileContext";
import { useTranslationContext } from "@/components/TranslationContext";
import { buildReferenceLabel } from "@/lib/api/bible";
import {
  HIGHLIGHTS_UPDATED_EVENT,
  NOTES_UPDATED_EVENT,
} from "@/lib/events";
import { usePassageText } from "@/lib/query/passages";
import { useHighlightsQuery } from "@/lib/query/highlights";
import { useNotesQuery } from "@/lib/query/notes";
import { useCurrentStudyQuery } from "@/lib/query/study";
import { useReaderPosition } from "@/lib/stores/reader-store";
import { formatWeekLabel } from "@/lib/study/week";
import type { BibleBookSummary } from "@/types/bible";
import type { WeeklyStudy } from "@/types/study";

export type HomeNotePreview = {
  id: string;
  reference: string | null;
  excerpt: string;
  updatedLabel: string | null;
};

export type HomeVerseSnapshot = {
  text: string;
  reference: string;
};

export type HomeQuickAction = {
  icon?: typeof BookOpen;
  label: string;
  subtitle: string;
  screen?: string;
  href?: string;
  renderIcon?: () => ReactNode;
  detail?: string;
};

const formatRelativeLabel = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getExcerpt = (body: string, limit = 120) => {
  const trimmed = body.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit - 1)}…`;
};

export function useHomeScreen(options?: {
  onNavigate?: (screen: string) => void;
}) {
  const router = useRouter();
  const { role } = useProfile();
  const onNavigate = options?.onNavigate;

  const handleNavigate = useCallback(
    (screen: string) => {
      onNavigate?.(screen);
    },
    [onNavigate],
  );

  const {
    books,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();
  const {
    bookId: continueBookId,
    chapter: continueChapter,
    hasHydrated: readerHydrated,
  } = useReaderPosition();

  const notesQuery = useNotesQuery(translationCode, {
    limit: 10,
    preview: true,
  });
  const highlightsQuery = useHighlightsQuery(translationCode);
  const studyQuery = useCurrentStudyQuery();
  const currentStudy: WeeklyStudy | null | undefined = studyQuery.data;

  const notesData = notesQuery.data ?? [];
  const highlightsData = highlightsQuery.data ?? [];

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

  const recentNotes = useMemo<HomeNotePreview[]>(() => {
    const sorted = [...notesData].sort((a, b) => {
      const left = new Date(a.updatedAt ?? a.createdAt ?? 0);
      const right = new Date(b.updatedAt ?? b.createdAt ?? 0);
      return right.getTime() - left.getTime();
    });

    return sorted.slice(0, 3).map((note) => {
      const book = note.bookId ? bookIndex.get(note.bookId) ?? null : null;
      return {
        id: note.id,
        reference: buildReferenceLabel(
          book ?? undefined,
          note.chapter,
          note.verseStart,
          note.verseEnd,
        ),
        excerpt: getExcerpt(note.body ?? "", 140),
        updatedLabel: formatRelativeLabel(
          note.updatedAt ?? note.createdAt ?? null,
        ),
      };
    });
  }, [bookIndex, notesData]);

  const highlightCandidate = highlightsData[0] ?? null;
  const verseBook = highlightCandidate?.bookId
    ? bookIndex.get(highlightCandidate.bookId) ?? null
    : null;

  const passageQuery = usePassageText(
    translationCode,
    verseBook?.name,
    highlightCandidate?.chapter,
    highlightCandidate?.verseStart,
    highlightCandidate?.verseEnd,
  );

  const todaysVerse = useMemo<HomeVerseSnapshot | null>(() => {
    if (!highlightCandidate || !verseBook || !passageQuery.data) {
      return null;
    }
    const reference = buildReferenceLabel(
      verseBook,
      highlightCandidate.chapter,
      highlightCandidate.verseStart,
      highlightCandidate.verseEnd,
    );
    if (!reference) return null;
    return { text: passageQuery.data, reference };
  }, [highlightCandidate, passageQuery.data, verseBook]);

  const isVerseLoading = Boolean(
    translationCode &&
      highlightCandidate &&
      verseBook &&
      passageQuery.isLoading,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleNotesUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ source?: string }>;
      if (custom.detail?.source === "home-screen") return;
      void notesQuery.refetch();
    };

    const handleHighlightsUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ source?: string }>;
      if (custom.detail?.source === "home-screen") return;
      void highlightsQuery.refetch();
    };

    window.addEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, handleHighlightsUpdated);

    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
      window.removeEventListener(
        HIGHLIGHTS_UPDATED_EVENT,
        handleHighlightsUpdated,
      );
    };
  }, [highlightsQuery, notesQuery]);

  useEffect(() => {
    if (notesQuery.isError && notesQuery.error) {
      toast.error(
        notesQuery.error instanceof Error
          ? notesQuery.error.message
          : "Failed to load notes",
      );
    }
  }, [notesQuery.error, notesQuery.isError]);

  useEffect(() => {
    if (highlightsQuery.isError && highlightsQuery.error) {
      toast.error(
        highlightsQuery.error instanceof Error
          ? highlightsQuery.error.message
          : "Failed to load highlights",
      );
    }
  }, [highlightsQuery.error, highlightsQuery.isError]);

  const continueBook = useMemo(() => {
    if (!continueBookId) return null;
    return bookIndex.get(continueBookId) ?? null;
  }, [bookIndex, continueBookId]);

  const quickActions = useMemo<HomeQuickAction[]>(() => {
    const canContinue =
      readerHydrated && Boolean(continueBook) && continueChapter >= 1;
    const continueHref = canContinue
      ? `/dashboard/reader?book=${encodeURIComponent(
          continueBook!.name,
        )}&chapter=${continueChapter}`
      : undefined;

    const actions: HomeQuickAction[] = [
      {
        icon: BookOpen,
        label: canContinue ? "Continue reading" : "Open Scripture",
        screen: continueHref ? undefined : "reader",
        href: continueHref,
        subtitle: canContinue
          ? `${continueBook!.name} ${continueChapter}`
          : "Return to the passage you were studying.",
      },
      {
        icon: Heart,
        label: "Favorites",
        screen: "highlights",
        subtitle: "Review verses you've saved.",
      },
      {
        icon: Lightbulb,
        label: "Reflections",
        screen: "notes",
        subtitle: "Capture insights in one place.",
      },
    ];
    if (currentStudy) {
      actions.push({
        icon: Book,
        label: "Weekly Study",
        href: "/pre-read",
        subtitle: "This week's topic and materials.",
      });
    }
    return actions;
  }, [continueBook, continueChapter, currentStudy, readerHydrated]);

  const studyMeta = currentStudy
    ? {
        title:
          currentStudy.title ||
          `${currentStudy.book} ${currentStudy.chapter}`,
        reference: `${currentStudy.book} ${currentStudy.chapter}${
          currentStudy.verses_range ? `:${currentStudy.verses_range}` : ""
        }${
          currentStudy.week_start
            ? ` · ${formatWeekLabel(currentStudy.week_start)}`
            : ""
        }`,
      }
    : null;

  const showLoading =
    isLoadingBooks ||
    isLoadingTranslations ||
    notesQuery.isLoading ||
    highlightsQuery.isLoading;

  const onQuickAction = useCallback(
    (action: HomeQuickAction) => {
      if (action.href) {
        router.push(action.href);
        return;
      }
      if (action.screen) {
        handleNavigate(action.screen);
      }
    },
    [handleNavigate, router],
  );

  return {
    role,
    showLoading,
    currentStudy,
    studyMeta,
    todaysVerse,
    isVerseLoading,
    recentNotes,
    quickActions,
    onNavigate: handleNavigate,
    onQuickAction,
    onNavigateSettings: () => handleNavigate("settings"),
    onNavigateNotes: () => handleNavigate("notes"),
  };
}
