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
  Settings,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useTranslationContext } from "./TranslationContext";
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

  const { books, translationCode } = useTranslationContext();

  const [isLoading, setIsLoading] = useState(true);
  const [notesCount, setNotesCount] = useState(0);
  const [highlightsCount, setHighlightsCount] = useState(0);
  const [memoryCount, setMemoryCount] = useState(0);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [recentNotes, setRecentNotes] = useState<NotePreview[]>([]);
  const [todaysVerse, setTodaysVerse] = useState<VerseSnapshot | null>(null);

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

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
        return;
      }

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

      try {
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
      }
    },
    [translationCode, bookIndex]
  );

  const loadHomeData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notes, highlights, memory] = await Promise.all([
        getUserNotes(10),
        getUserHighlights(),
        getUserMemoryVerses(),
      ]);

      setNotesCount(notes.length);
      setHighlightsCount(highlights.length);
      setMemoryCount(memory.length);

      const today = new Date();
      const reviewCount = memory.filter((verse) => {
        if (!verse.nextReviewDate) {
          return false;
        }
        const nextReview = new Date(verse.nextReviewDate);
        if (Number.isNaN(nextReview.getTime())) {
          return false;
        }
        return nextReview <= today;
      }).length;
      setNeedsReviewCount(reviewCount);

      const previews = notes.slice(0, 3).map<NotePreview>((note: UserNote) => {
        const book = note.bookId ? bookIndex.get(note.bookId) : null;
        return {
          id: note.id,
          reference: buildReferenceLabel(
            book ?? undefined,
            note.chapter,
            note.verseStart,
            note.verseEnd
          ),
          excerpt: getExcerpt(note.body, 140),
          updatedLabel: formatDate(note.updatedAt ?? note.createdAt),
        };
      });
      setRecentNotes(previews);

      const highlightCandidate =
        highlights.length > 0
          ? {
              bookId: highlights[0]!.bookId,
              chapter: highlights[0]!.chapter,
              verseStart: highlights[0]!.verseStart,
              verseEnd: highlights[0]!.verseEnd,
            }
          : null;

      const memoryCandidate = memory.length > 0 ? memory[0]! : null;

      await determineVerseSnapshot(highlightCandidate, memoryCandidate);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load dashboard data";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [bookIndex, determineVerseSnapshot]);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler: EventListener = () => {
      void loadHomeData();
    };

    window.addEventListener(NOTES_UPDATED_EVENT, handler);
    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, handler);
    window.addEventListener(MEMORY_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handler);
      window.removeEventListener(HIGHLIGHTS_UPDATED_EVENT, handler);
      window.removeEventListener(MEMORY_UPDATED_EVENT, handler);
    };
  }, [loadHomeData]);

  type QuickAction = {
    icon?: typeof BookOpen;
    label: string;
    subtitle: string;
    screen?: string;
    href?: string;
    renderIcon?: () => ReactNode;
  };

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        icon: BookOpen,
        label: "Open Reader",
        screen: "reader",
        subtitle: translationCode
          ? `${translationCode.toUpperCase()} active`
          : "Choose a translation",
      },
      {
        icon: Heart,
        label: "My Highlights",
        screen: "highlights",
        subtitle: `${highlightsCount} saved`,
      },
      {
        icon: Lightbulb,
        label: "Study Notes",
        screen: "notes",
        subtitle: `${notesCount} reflections`,
      },
      {
        icon: Brain,
        label: "Memory Verses",
        screen: "memory",
        subtitle: `${needsReviewCount} need review`,
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
        subtitle: " ",
      },
      {
        icon: Settings,
        label: "Settings",
        screen: "settings",
        subtitle: "",
      },
    ],
    [translationCode, highlightsCount, notesCount, needsReviewCount]
  );

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

  return (
    <div className={styles.page}>
      {isLoading ? (
        <LoadingScreen subtitle="We're gathering your notes, highlights, and memory verses." />
      ) : (
        <div className={styles.stack}>
          <div className={styles.welcomeBlock}>
            <h1 className={styles.welcomeTitle}>Welcome back</h1>
            <p className={styles.welcomeSubtitle}>
              Stay rooted in Scripture today
            </p>
          </div>

          {todaysVerse ? (
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
                  <blockquote className={styles.verseQuote}>
                    “{todaysVerse.text}”
                  </blockquote>
                  <cite className={styles.verseReference}>
                    — {todaysVerse.reference}
                  </cite>
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
