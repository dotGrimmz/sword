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
  ArrowUpRight,
  Book,
  BookOpen,
  Calendar,
  Clock,
  Heart,
  Lightbulb,
  Loader2,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useProfile } from "./ProfileContext";
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
import { buildReferenceLabel, getPassage } from "@/lib/api/bible";
import { getUserHighlights } from "@/lib/api/highlights";
import { getUserNotes } from "@/lib/api/notes";
import { getProfile } from "@/lib/api/profile";
import { getCurrentStudy } from "@/lib/api/study";
import type { UserNote } from "@/types/user";
import {
  HIGHLIGHTS_UPDATED_EVENT,
  NOTES_UPDATED_EVENT,
} from "@/lib/events";
import styles from "./HomeScreen.module.css";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import type { BibleBookSummary } from "@/types/bible";
import { formatWeekLabel } from "@/lib/study/week";

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
  const { role } = useProfile();
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

  const notesQuery = useQuery({
    queryKey: queryKeys.userNotesPreview(translationKey),
    queryFn: () => getUserNotes(10, translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: fetchEnabled,
  });
  const highlightsQuery = useQuery({
    queryKey: queryKeys.userHighlights(translationKey),
    queryFn: () => getUserHighlights(translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: fetchEnabled,
  });
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: getProfile,
    staleTime: STALE_TIMES.profile,
  });
  const avatarUrl = profileQuery.data?.avatar_url?.trim() || null;

  const studyQuery = useQuery({
    queryKey: queryKeys.studyCurrent(),
    queryFn: getCurrentStudy,
    staleTime: STALE_TIMES.profile,
  });
  const currentStudy = studyQuery.data;

  const notesData = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const highlightsData = useMemo(
    () => highlightsQuery.data ?? [],
    [highlightsQuery.data]
  );

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
      } | null
    ) => {
      if (!translationCode) {
        setTodaysVerse(null);
        setIsVerseLoading(false);
        return;
      }

      setIsVerseLoading(true);

      try {
        const candidate = highlight;

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

    window.addEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, handleHighlightsUpdated);

    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
      window.removeEventListener(
        HIGHLIGHTS_UPDATED_EVENT,
        handleHighlightsUpdated
      );
    };
  }, [highlightsQuery, notesQuery]);

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

    void determineVerseSnapshot(highlightCandidate);
  }, [determineVerseSnapshot, highlightsData, translationCode]);

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

  type QuickAction = {
    icon?: typeof BookOpen;
    label: string;
    subtitle: string;
    screen?: string;
    href?: string;
    renderIcon?: () => ReactNode;
    detail?: string;
  };

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        icon: BookOpen,
        label: "Open Scripture",
        screen: "reader",
        subtitle: "Return to the passage you were studying.",
      },
      {
        icon: Heart,
        label: "Marked",
        screen: "highlights",
        subtitle: "Review verses you marked.",
      },
      {
        icon: Lightbulb,
        label: "Reflections",
        screen: "notes",
        subtitle: "Capture insights in one place.",
      },
      {
        icon: Book,
        label: "Weekly Study",
        href: "/pre-read",
        subtitle: "This week's topic and materials.",
      },
    ],
    []
  );

  const progressData = useMemo(() => {
    const total = notesCount + highlightsCount;
    if (total === 0) {
      return [
        { label: "Reflections captured", value: 0 },
        { label: "Marked verses", value: 0 },
      ];
    }
    return [
      {
        label: "Reflections captured",
        value: Math.round((notesCount / total) * 100),
      },
      {
        label: "Marked verses",
        value: Math.round((highlightsCount / total) * 100),
      },
    ];
  }, [notesCount, highlightsCount]);

  const showLoading =
    isLoadingBooks ||
    isLoadingTranslations ||
    notesQuery.isLoading ||
    highlightsQuery.isLoading;

  return (
    <div className={styles.page}>
      {showLoading ? (
        <LoadingScreen subtitle="We're gathering your reflections and marked passages." />
      ) : (
        <div className={styles.stack}>
          <div className={styles.headerStrip}>
            <div className={styles.welcomeBlock}>
              <h1 className={styles.welcomeTitle}>Welcome back</h1>
              <p className={styles.welcomeSubtitle}>
                Stay rooted in Scripture today
              </p>
            </div>

            <div className={styles.headerToolbar}>
              <TranslationSwitcher
                className={styles.translationSwitcher}
                selectClassName={styles.translationSwitcherTrigger}
                hideLabel
                showCodeOnly
                size="compact"
              />
              <button
                type="button"
                className={styles.profileButton}
                aria-label="Profile"
                title="Profile"
                onClick={() => handleNavigate("settings")}
              >
                <Avatar className={styles.profileAvatar}>
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt="" />
                  ) : null}
                  <AvatarFallback className={styles.profileAvatarFallback}>
                    <User className={styles.profileIcon} aria-hidden="true" />
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>

          <p className={styles.welcomeTagline}>
            Scripture • Wisdom • Order • Reflection • Devotion
          </p>

          {role === "admin" ? (
            <Link href="/admin" className={styles.adminEntry}>
              <span className={styles.adminEntryIconWrap} aria-hidden="true">
                <Shield className={styles.adminEntryIcon} />
              </span>
              <span className={styles.adminEntryBody}>
                <span className={styles.adminEntryEyebrow}>Admin</span>
                <span className={styles.adminEntryTitle}>Admin console</span>
                <span className={styles.adminEntryMeta}>
                  Manage weekly study, hosts, and login QR
                </span>
              </span>
              <ArrowUpRight className={styles.adminEntryCta} aria-hidden="true" />
            </Link>
          ) : null}

          <Link href="/pre-read" className={styles.studyPanel}>
            <p className={styles.studyPanelEyebrow}>This Week&apos;s Study</p>
            {studyQuery.isLoading ? (
              <p className={styles.studyPanelMeta}>Loading…</p>
            ) : currentStudy ? (
              <>
                <h2 className={styles.studyPanelTitle}>
                  {currentStudy.title ||
                    `${currentStudy.book} ${currentStudy.chapter}`}
                </h2>
                <p className={styles.studyPanelMeta}>
                  {currentStudy.book} {currentStudy.chapter}
                  {currentStudy.verses_range
                    ? `:${currentStudy.verses_range}`
                    : ""}
                  {currentStudy.week_start
                    ? ` · ${formatWeekLabel(currentStudy.week_start)}`
                    : ""}
                </p>
                <span className={styles.studyPanelCta}>
                  Open study hub
                  <ArrowUpRight className={styles.studyPanelCtaIcon} />
                </span>
              </>
            ) : (
              <>
                <h2 className={styles.studyPanelTitle}>
                  No study posted this week
                </h2>
                <p className={styles.studyPanelMeta}>
                  Check back once your pastor publishes materials.
                </p>
              </>
            )}
          </Link>

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
                    className={styles.quickCard}
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
                    <CardContent className={styles.quickCardContent}>
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

          <p className={styles.ministryCredit}>Realign Ministries</p>
        </div>
      )}
    </div>
  );
}
