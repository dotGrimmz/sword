"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
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
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import {
  buildReferenceLabel,
  getPassage,
} from "@/lib/api/bible";
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
  const handleNavigate = useCallback(
    (screen: string) => {
      onNavigate?.(screen);
    },
    [onNavigate]
  );

  const {
    books,
    translationCode,
  } = useTranslationContext();

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

      const candidate = highlight ?? (memory
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
          reference: buildReferenceLabel(book ?? undefined, note.chapter, note.verseStart, note.verseEnd),
          excerpt: getExcerpt(note.body, 140),
          updatedLabel: formatDate(note.updatedAt ?? note.createdAt),
        };
      });
      setRecentNotes(previews);

      const highlightCandidate = highlights.length > 0 ? {
        bookId: highlights[0]!.bookId,
        chapter: highlights[0]!.chapter,
        verseStart: highlights[0]!.verseStart,
        verseEnd: highlights[0]!.verseEnd,
      } : null;

      const memoryCandidate = memory.length > 0 ? memory[0]! : null;

      await determineVerseSnapshot(highlightCandidate, memoryCandidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard data";
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

  const quickActions = useMemo(
    () => [
      {
        icon: BookOpen,
        label: "Open Reader",
        screen: "reader",
        subtitle: translationCode ? `${translationCode.toUpperCase()} active` : "Choose a translation",
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
      { label: "Notes captured", value: Math.round((notesCount / total) * 100) },
      { label: "Highlights", value: Math.round((highlightsCount / total) * 100) },
      { label: "Memory verses", value: Math.round((memoryCount / total) * 100) },
    ];
  }, [notesCount, highlightsCount, memoryCount]);

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-secondary/10 p-4 pb-20">
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading dashboard...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl text-primary">Welcome back</h1>
            <p className="text-muted-foreground">Stay rooted in Scripture today</p>
          </div>

          {todaysVerse ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="border-accent/40 bg-gradient-to-r from-card to-secondary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm text-accent">Verse of the day</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <blockquote className="scripture-text text-base leading-relaxed text-foreground mb-3 italic">
                    “{todaysVerse.text}”
                  </blockquote>
                  <cite className="text-sm text-primary">— {todaysVerse.reference}</cite>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          <div className="space-y-3">
            <h2 className="text-lg text-foreground">Continue your journey</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.screen}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer border-border/40 bg-card/80 hover:shadow-md transition shadow-sm"
                    onClick={() => handleNavigate(action.screen)}
                  >
                    <CardContent className="flex flex-col gap-2 p-4">
                      <action.icon className="h-6 w-6 text-primary" />
                      <div>
                        <CardTitle className="text-sm">{action.label}</CardTitle>
                        <CardDescription className="text-xs">{action.subtitle}</CardDescription>
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
            <Card className="border-border/40 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Rhythm overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {progressData.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{item.label}</span>
                      <span className="text-muted-foreground">{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {recentNotes.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <Card className="border-border/40 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Recent reflections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentNotes.map((note) => (
                    <div key={note.id} className="text-sm">
                      <p className="text-muted-foreground text-xs">
                        {note.reference ?? "Unspecified reference"}
                        {note.updatedLabel ? ` • ${note.updatedLabel}` : ""}
                      </p>
                      <p className="scripture-text text-foreground">{note.excerpt}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ) : null}
        </div>
      )}
    </div>
  );
}
