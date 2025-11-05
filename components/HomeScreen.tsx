"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  BookOpen,
  Brain,
  Calendar,
  Clock,
  Heart,
  Lightbulb,
  Loader2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useTranslationContext } from "./TranslationContext";
import { TranslationSwitcher } from "./TranslationSwitcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Progress } from "./ui/progress";
import { cn } from "./ui/utils";
import { buildReferenceLabel, getPassage } from "@/lib/api/bible";
import { getUserHighlights } from "@/lib/api/highlights";
import { getUserMemoryVerses } from "@/lib/api/memory";
import { getUserNotes } from "@/lib/api/notes";
import type { BibleBookSummary } from "@/types/bible";
import type { UserMemoryVerse, UserNote } from "@/types/user";
import {
  HIGHLIGHTS_UPDATED_EVENT,
  MEMORY_UPDATED_EVENT,
  NOTES_UPDATED_EVENT,
} from "@/lib/events";
import styles from "./HomeScreen.module.css";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useProfile } from "@/components/ProfileContext";
import { useDataQuery } from "@/lib/data-cache/DataCacheProvider";

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

type NotePreview = {
  id: string;
  reference: string | null;
  excerpt: string;
  updatedLabel: string | null;
};

type VerseSnapshot = {
  text: string;
  reference: string;
};

const formatDate = (iso: string | null) => {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getExcerpt = (body: string, limit = 120) => {
  const trimmed = body.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit - 1)}…`;
};

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const router = useRouter();
  const handleNavigate = useCallback(
    (screen: string) => {
      onNavigate?.(screen);
    },
    [onNavigate]
  );

  const {
    books,
    translation,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();

  const translationKey = translationCode ?? "none";
  const fetchEnabled = Boolean(translationCode);

  const notesQuery = useDataQuery<UserNote[]>(
    `user-notes-preview-${translationKey}`,
    () => getUserNotes(10, translationCode ?? undefined),
    { staleTime: 1000 * 60 * 5, enabled: fetchEnabled }
  );
  const highlightsQuery = useDataQuery(
    `user-highlights-${translationKey}`,
    () => getUserHighlights(translationCode ?? undefined),
    { staleTime: 1000 * 60 * 5, enabled: fetchEnabled }
  );
  const memoryQuery = useDataQuery(
    `user-memory-verses-${translationKey}`,
    () => getUserMemoryVerses(translationCode ?? undefined),
    { staleTime: 1000 * 60 * 5, enabled: fetchEnabled }
  );

  const notesData = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const highlightsData = useMemo(
    () => highlightsQuery.data ?? [],
    [highlightsQuery.data]
  );
  const memoryData = useMemo(() => memoryQuery.data ?? [], [memoryQuery.data]);

  const [todaysVerse, setTodaysVerse] = useState<VerseSnapshot | null>(null);
  const [isVerseLoading, setIsVerseLoading] = useState(true);

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

  const notesCount = notesData.length;
  const highlightsCount = highlightsData.length;
  const memoryCount = memoryData.length;

  const needsReviewCount = useMemo(() => {
    const today = new Date();
    return memoryData.filter((verse) => {
      if (!verse.nextReviewDate) {
        return false;
      }
      const nextReview = new Date(verse.nextReviewDate);
      if (Number.isNaN(nextReview.getTime())) {
        return false;
      }
      return nextReview <= today;
    }).length;
  }, [memoryData]);

  const recentNotes = useMemo<NotePreview[]>(() => {
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
          note.verseEnd
        ),
        excerpt: getExcerpt(note.body, 140),
        updatedLabel: formatDate(note.updatedAt ?? note.createdAt ?? null),
      } satisfies NotePreview;
    });
  }, [bookIndex, notesData]);

  const determineVerseSnapshot = useCallback(
    async (
      highlight: {
        bookId: string | null;
        chapter: number;
        verseStart: number;
        verseEnd: number;
      } | null,
      memory: UserMemoryVerse | null
    ) => {
      if (!translationCode) {
        setTodaysVerse(null);
        setIsVerseLoading(false);
        return;
      }

      setIsVerseLoading(true);

      try {
        const candidate =
          highlight ??
          (memory
            ? {
                bookId: memory.bookId,
                chapter: memory.chapter ?? 1,
                verseStart: memory.verseStart ?? 1,
                verseEnd: memory.verseEnd ?? memory.verseStart ?? 1,
              }
            : null);

        if (!candidate || !candidate.bookId) {
          setTodaysVerse(null);
          return;
        }

        const book = bookIndex.get(candidate.bookId);

        if (!book) {
          setTodaysVerse(null);
          return;
        }

        const passage = await getPassage(
          translationCode,
          book.name,
          { chapter: candidate.chapter, verse: candidate.verseStart },
          { chapter: candidate.chapter, verse: candidate.verseEnd }
        );

        const text = passage.verses.map((entry) => entry.text).join(" ");
        const reference = buildReferenceLabel(
          book,
          candidate.chapter,
          candidate.verseStart,
          candidate.verseEnd
        );

        if (text && reference) {
          setTodaysVerse({ text, reference });
        } else {
          setTodaysVerse(null);
        }
      } catch (error) {
        console.error("Failed to load verse of the day", error);
        setTodaysVerse(null);
      } finally {
        setIsVerseLoading(false);
      }
    },
    [translationCode, bookIndex]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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

    const handleMemoryUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ source?: string }>;
      if (custom.detail?.source === "home-screen") return;
      void memoryQuery.refetch();
    };

    window.addEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, handleHighlightsUpdated);
    window.addEventListener(MEMORY_UPDATED_EVENT, handleMemoryUpdated);

    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
      window.removeEventListener(
        HIGHLIGHTS_UPDATED_EVENT,
        handleHighlightsUpdated
      );
      window.removeEventListener(MEMORY_UPDATED_EVENT, handleMemoryUpdated);
    };
  }, [highlightsQuery, memoryQuery, notesQuery]);

  useEffect(() => {
    if (!translationCode) {
      setTodaysVerse(null);
      setIsVerseLoading(false);
      return;
    }

    const highlightCandidate =
      highlightsData.length > 0
        ? {
            bookId: highlightsData[0]!.bookId,
            chapter: highlightsData[0]!.chapter,
            verseStart: highlightsData[0]!.verseStart,
            verseEnd: highlightsData[0]!.verseEnd,
          }
        : null;

    const memoryCandidate = memoryData.length > 0 ? memoryData[0]! : null;

    void determineVerseSnapshot(highlightCandidate, memoryCandidate);
  }, [determineVerseSnapshot, highlightsData, memoryData, translationCode]);

  useEffect(() => {
    if (notesQuery.isError && notesQuery.error) {
      const message =
        notesQuery.error instanceof Error
          ? notesQuery.error.message
          : "Failed to load notes";
      toast.error(message);
    }
  }, [notesQuery.error, notesQuery.isError]);

  useEffect(() => {
    if (highlightsQuery.isError && highlightsQuery.error) {
      const message =
        highlightsQuery.error instanceof Error
          ? highlightsQuery.error.message
          : "Failed to load highlights";
      toast.error(message);
    }
  }, [highlightsQuery.error, highlightsQuery.isError]);

  useEffect(() => {
    if (memoryQuery.isError && memoryQuery.error) {
      const message =
        memoryQuery.error instanceof Error
          ? memoryQuery.error.message
          : "Failed to load memory verses";
      toast.error(message);
    }
  }, [memoryQuery.error, memoryQuery.isError]);

  type QuickAction = {
    icon?: typeof BookOpen;
    label: string;
    subtitle: string;
    screen?: string;
    href?: string;
    renderIcon?: () => ReactNode;
    detail?: string;
  };

  const { role } = useProfile();
  const isAdmin = role === "admin";

  const quickActions = useMemo<QuickAction[]>(() => {
    const actions: QuickAction[] = [
      {
        icon: BookOpen,
        label: "Open Reader",
        screen: "reader",
        subtitle: translationCode
          ? `${translation?.name ?? translationCode.toUpperCase()} active`
          : "Choose a translation",
        detail: "Return to the passage you were studying.",
      },
      {
        icon: Heart,
        label: "My Highlights",
        screen: "highlights",
        subtitle: `${highlightsCount} saved`,
        detail: "Review and reflect on verses you marked.",
      },
      {
        icon: Lightbulb,
        label: "Study Notes",
        screen: "notes",
        subtitle: `${notesCount} reflections`,
        detail: "Capture insights and prayers in one place.",
      },
      {
        icon: Brain,
        label: "Memory Verses",
        screen: "memory",
        subtitle: `${needsReviewCount} need review`,
        detail: "Strengthen recall with gentle spaced reviews.",
      },
      {
        renderIcon: () => (
          <Image
            src="/sword_logo.png"
            alt="SWORD logo"
            width={36}
            height={36}
            className={styles.quickLogo}
          />
        ),
        label: "Apologetics",
        href: "/apologetics",
        subtitle: "Engage tough questions with confidence.",
        detail: "Explore evidence, counters, and curated sources.",
      },
    ];

    if (isAdmin) {
      actions.splice(actions.length, 0, {
        icon: ShieldCheck,
        label: "Admin Console",
        href: "/admin",
        subtitle: "Manage Apologetics content.",
        detail: "Publish, edit, and organize topics, paths, and sources.",
      });
    }

    actions.push({
      icon: Settings,
      label: "Settings",
      screen: "settings",
      subtitle: "Manage your account and theme.",
      detail: "Update preferences, appearance, and profile info.",
    });

    return actions;
  }, [
    translation?.name,
    translationCode,
    highlightsCount,
    notesCount,
    needsReviewCount,
    isAdmin,
  ]);

  const progressData = useMemo(() => {
    const total = notesCount + highlightsCount + memoryCount;
    if (total === 0) {
      return [
        { label: "Notes captured", value: 0 },
        { label: "Highlights", value: 0 },
        { label: "Memory verses", value: 0 },
      ];
    }
    return [
      {
        label: "Notes captured",
        value: Math.round((notesCount / total) * 100),
      },
      {
        label: "Highlights",
        value: Math.round((highlightsCount / total) * 100),
      },
      {
        label: "Memory verses",
        value: Math.round((memoryCount / total) * 100),
      },
    ];
  }, [notesCount, highlightsCount, memoryCount]);

  const notesPriming =
    fetchEnabled && notesQuery.isLoading && notesQuery.data === undefined;
  const highlightsPriming =
    fetchEnabled &&
    highlightsQuery.isLoading &&
    highlightsQuery.data === undefined;
  const memoryPriming =
    fetchEnabled && memoryQuery.isLoading && memoryQuery.data === undefined;

  const showLoading =
    isLoadingBooks ||
    isLoadingTranslations ||
    notesPriming ||
    highlightsPriming ||
    memoryPriming;

  return (
    <div className={styles.page}>
      {showLoading ? (
        <LoadingScreen subtitle="We're gathering your notes, highlights, and memory verses." />
      ) : (
        <div className={styles.stack}>
          <div className={styles.headerStrip}>
            <div className={styles.welcomeBlock}>
              <h1 className={styles.welcomeTitle}>Welcome back</h1>
              <p className={styles.welcomeSubtitle}>
                Stay rooted in Scripture today
              </p>
            </div>

            <TranslationSwitcher
              className={styles.translationSwitcher}
              selectClassName={styles.translationSwitcherTrigger}
              hideLabel
              size="compact"
            />
          </div>

          {isVerseLoading || todaysVerse ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className={styles.verseCard}>
                <CardHeader className={styles.verseHeader}>
                  <div className={styles.verseHeaderInner}>
                    <Calendar className={styles.verseIcon} aria-hidden="true" />
                    <CardTitle className={styles.verseTitle}>
                      Verse of the day
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className={styles.verseContent}>
                  {isVerseLoading || !todaysVerse ? (
                    <div className={styles.verseLoader}>
                      <Loader2
                        className={styles.verseLoaderIcon}
                        aria-hidden="true"
                      />
                      <span>Preparing today&apos;s verse…</span>
                    </div>
                  ) : (
                    <>
                      <blockquote className={styles.verseQuote}>
                        “{todaysVerse.text}”
                      </blockquote>
                      <cite className={styles.verseReference}>
                        — {todaysVerse.reference}
                      </cite>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          <div className={styles.quickSection}>
            <h2 className={styles.sectionTitle}>Continue your journey</h2>
            <div className={styles.quickGrid}>
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      styles.quickCard,
                      action.href === "/apologetics" &&
                        styles.quickCardApologetics
                    )}
                    onClick={() => {
                      if (action.href) {
                        router.push(action.href);
                        return;
                      }
                      if (action.screen) {
                        handleNavigate(action.screen);
                      }
                    }}
                  >
                    <CardContent
                      className={cn(
                        styles.quickCardContent,
                        action.href === "/apologetics" &&
                          styles.quickCardContentCentered
                      )}
                    >
                      {action.renderIcon ? (
                        <div className={styles.quickIconWrapper}>
                          {action.renderIcon()}
                        </div>
                      ) : action.icon ? (
                        <action.icon
                          className={styles.quickIcon}
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className={styles.quickCopy}>
                        <CardTitle className={styles.quickCardTitle}>
                          {action.label}
                        </CardTitle>
                        <CardDescription
                          className={styles.quickCardDescription}
                        >
                          {action.subtitle}
                        </CardDescription>
                        {action.detail ? (
                          <p className={styles.quickFootnote}>
                            {action.detail}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className={styles.statsCard}>
              <CardHeader className={styles.statsHeader}>
                <CardTitle className={styles.statsTitle}>
                  <Clock className={styles.statsIcon} aria-hidden="true" />
                  Rhythm overview
                </CardTitle>
              </CardHeader>
              <CardContent className={styles.statsContent}>
                {progressData.map((item) => (
                  <div key={item.label} className={styles.progressRow}>
                    <div className={styles.progressMeta}>
                      <span className={styles.progressLabel}>{item.label}</span>
                      <span className={styles.progressValue}>
                        {item.value}%
                      </span>
                    </div>
                    <Progress
                      value={item.value}
                      className={styles.progressBar}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <Card className={styles.notesCard}>
              <CardHeader className={styles.notesHeader}>
                <CardTitle className={styles.notesTitle}>
                  Recent reflections
                </CardTitle>
              </CardHeader>
              <CardContent className={styles.notesContent}>
                {recentNotes.length > 0 ? (
                  recentNotes.map((note) => (
                    <div key={note.id} className={styles.noteItem}>
                      <p className={styles.noteMeta}>
                        {note.reference ?? "Unspecified reference"}
                        {note.updatedLabel ? ` • ${note.updatedLabel}` : ""}
                      </p>
                      <p className={styles.noteExcerpt}>{note.excerpt}</p>
                    </div>
                  ))
                ) : (
                  <div className={styles.notePlaceholder}>
                    <div className={styles.notePlaceholderBadge}>
                      <Image
                        src="/sword_logo.png"
                        alt="Sword logo"
                        width={86}
                        height={86}
                        className={styles.notePlaceholderImage}
                      />
                    </div>
                    <h3 className={styles.notePlaceholderTitle}>
                      Your next reflection starts here
                    </h3>
                    <p className={styles.notePlaceholderCopy}>
                      Capture a takeaway, prayer, or question and watch this
                      space fill with your study journey.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
