"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Brain,
  Calendar,
  Loader2,
  Plus,
  Target,
  Trash2,
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { buildReferenceLabel, getPassage } from "@/lib/api/bible";
import {
  createUserMemoryVerse,
  deleteUserMemoryVerse,
  getUserMemoryVerses,
} from "@/lib/api/memory";
import type { BibleBookSummary } from "@/types/bible";
import type { UserMemoryVerse } from "@/types/user";
import {
  MEMORY_UPDATED_EVENT,
  dispatchMemoryUpdated,
} from "@/lib/events";

interface MemoryScreenProps {
  onNavigate?: (screen: string) => void;
}

type MemoryVerseViewModel = {
  raw: UserMemoryVerse;
  bookName: string;
  referenceLabel: string | null;
  verseText: string;
  nextReviewLabel: string | null;
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
    year: "numeric",
  }).format(date);
};

export function MemoryScreen({ onNavigate }: MemoryScreenProps = {}) {
  void onNavigate;

  const {
    books,
    translationCode,
    isLoadingTranslations,
    isLoadingBooks,
  } = useTranslationContext();

  const [memoryVerses, setMemoryVerses] = useState<UserMemoryVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBookId, setCreateBookId] = useState<string | null>(null);
  const [createChapter, setCreateChapter] = useState("1");
  const [createVerseStart, setCreateVerseStart] = useState("1");
  const [createVerseEnd, setCreateVerseEnd] = useState("1");
  const [createLabel, setCreateLabel] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSavingCreate, setIsSavingCreate] = useState(false);

  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});
  const verseTextsRef = useRef(verseTexts);
  const pendingPassages = useRef(new Set<string>());

  useEffect(() => {
    verseTextsRef.current = verseTexts;
  }, [verseTexts]);

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

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
    if (isCreateOpen) {
      resetCreateForm();
    }
  }, [isCreateOpen, resetCreateForm]);

  useEffect(() => {
    setCreateVerseEnd((current) => {
      const startValue = Number.parseInt(createVerseStart, 10);
      const endValue = Number.parseInt(current, 10);

      if (!Number.isFinite(startValue)) {
        return current;
      }

      if (!Number.isFinite(endValue) || endValue < startValue) {
        return `${startValue}`;
      }

      return current;
    });
  }, [createVerseStart]);

  const loadMemoryVerses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUserMemoryVerses();
      setMemoryVerses(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load memory verses";
      toast.error(message);
      setMemoryVerses([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemoryVerses();
  }, [loadMemoryVerses]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler: EventListener = (event) => {
      const custom = event as CustomEvent<{ source?: string }>;
      if (custom.detail?.source === "memory-screen") {
        return;
      }
      void loadMemoryVerses();
    };

    window.addEventListener(MEMORY_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(MEMORY_UPDATED_EVENT, handler);
    };
  }, [loadMemoryVerses]);

  useEffect(() => {
    if (!translationCode) {
      return;
    }

    for (const verse of memoryVerses) {
      const key = verse.id;
      if (verseTextsRef.current[key] !== undefined) {
        continue;
      }

      if (pendingPassages.current.has(key)) {
        continue;
      }

      const book = verse.bookId ? bookIndex.get(verse.bookId) : null;

      if (!book || !verse.chapter || !verse.verseStart) {
        setVerseTexts((prev) => ({ ...prev, [key]: "" }));
        continue;
      }

      pendingPassages.current.add(key);

      void getPassage(
        translationCode,
        book.name,
        { chapter: verse.chapter, verse: verse.verseStart },
        {
          chapter: verse.chapter,
          verse: verse.verseEnd ?? verse.verseStart,
        }
      )
        .then((response) => {
          const text = response.verses.map((entry) => entry.text).join(" ");
          setVerseTexts((prev) => ({ ...prev, [key]: text }));
        })
        .catch(() => {
          setVerseTexts((prev) => ({ ...prev, [key]: "" }));
        })
        .finally(() => {
          pendingPassages.current.delete(key);
        });
    }
  }, [memoryVerses, translationCode, bookIndex]);

  const derivedVerses = useMemo<MemoryVerseViewModel[]>(() => {
    return memoryVerses.map((verse) => {
      const book = verse.bookId ? bookIndex.get(verse.bookId) : null;
      const referenceLabel = buildReferenceLabel(
        book ?? undefined,
        verse.chapter,
        verse.verseStart,
        verse.verseEnd
      );
      return {
        raw: verse,
        bookName: book?.name ?? "",
        referenceLabel,
        verseText: verseTexts[verse.id] ?? "",
        nextReviewLabel: formatDate(verse.nextReviewDate),
      };
    });
  }, [memoryVerses, bookIndex, verseTexts]);

  const filteredVerses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return derivedVerses;
    }
    return derivedVerses.filter((verse) => {
      return (
        verse.bookName.toLowerCase().includes(query) ||
        (verse.referenceLabel && verse.referenceLabel.toLowerCase().includes(query)) ||
        verse.verseText.toLowerCase().includes(query)
      );
    });
  }, [derivedVerses, searchQuery]);

  const needsReviewCount = useMemo(() => {
    const today = new Date();
    return memoryVerses.filter((verse) => {
      if (!verse.nextReviewDate) {
        return false;
      }
      const nextReview = new Date(verse.nextReviewDate);
      if (Number.isNaN(nextReview.getTime())) {
        return false;
      }
      return nextReview <= today;
    }).length;
  }, [memoryVerses]);

  const averageInterval = useMemo(() => {
    if (memoryVerses.length === 0) {
      return 0;
    }
    const sum = memoryVerses.reduce((accumulator, verse) => accumulator + (verse.intervalDays ?? 0), 0);
    return Math.round(sum / memoryVerses.length);
  }, [memoryVerses]);

  const handleCreate = async () => {
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

    setIsSavingCreate(true);
    setCreateError(null);

    try {
      const created = await createUserMemoryVerse({
        bookId: createBookId,
        chapter: chapterValue,
        verseStart: verseStartValue,
        verseEnd: verseEndValue,
        label: createLabel.trim() || null,
      });

      setMemoryVerses((prev) => [created, ...prev]);
      setVerseTexts((prev) => {
        const next = { ...prev };
        delete next[created.id];
        return next;
      });
      setIsCreateOpen(false);
      toast.success("Memory verse added");
      dispatchMemoryUpdated({ source: "memory-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save memory verse";
      toast.error(message);
    } finally {
      setIsSavingCreate(false);
    }
  };

  const handleDelete = async (verse: UserMemoryVerse) => {
    const previous = memoryVerses;
    setMemoryVerses((prev) => prev.filter((item) => item.id !== verse.id));
    setVerseTexts((prev) => {
      const next = { ...prev };
      delete next[verse.id];
      return next;
    });

    try {
      await deleteUserMemoryVerse(verse.id);
      toast.success("Memory verse removed");
      dispatchMemoryUpdated({ source: "memory-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove memory verse";
      toast.error(message);
      setMemoryVerses(previous);
    }
  };

  const selectedBook = createBookId ? bookIndex.get(createBookId) : null;
  const chapterCount = selectedBook?.chapters ?? 1;

  const busy = isLoading || isLoadingTranslations || isLoadingBooks;

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl text-primary">Memory Verses</h1>
            <p className="text-xs text-muted-foreground">
              {memoryVerses.length} saved • {needsReviewCount} ready for review
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90" disabled={books.length === 0}>
                <Plus className="mr-1 h-4 w-4" /> Add Verse
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[92vw] max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Memory Verse</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Book</span>
                    <Select
                      value={createBookId ?? undefined}
                      onValueChange={(value) => {
                        setCreateBookId(value);
                        setCreateChapter("1");
                        setCreateVerseStart("1");
                        setCreateVerseEnd("1");
                      }}
                    >
                      <SelectTrigger className="bg-input-background border-border/50">
                        <SelectValue placeholder="Select book" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {books.map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Chapter</span>
                    <Select
                      value={createChapter}
                      onValueChange={(value) => {
                        setCreateChapter(value);
                        setCreateVerseStart("1");
                        setCreateVerseEnd("1");
                      }}
                    >
                      <SelectTrigger className="bg-input-background border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {Array.from({ length: chapterCount }, (_, index) => index + 1).map((chapterNumber) => (
                          <SelectItem key={chapterNumber} value={`${chapterNumber}`}>
                            {chapterNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Verse start</span>
                    <Input
                      type="number"
                      min={1}
                      value={createVerseStart}
                      onChange={(event) => setCreateVerseStart(event.target.value)}
                      className="bg-input-background border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Verse end</span>
                    <Input
                      type="number"
                      min={createVerseStart}
                      value={createVerseEnd}
                      onChange={(event) => setCreateVerseEnd(event.target.value)}
                      className="bg-input-background border-border/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Label (optional)</span>
                  <Input
                    value={createLabel}
                    onChange={(event) => setCreateLabel(event.target.value)}
                    placeholder="Hope, Strength, Promise..."
                    className="bg-input-background border-border/50"
                  />
                </div>
                {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleCreate}
                  disabled={isSavingCreate}
                >
                  {isSavingCreate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Memory Verse
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-border/40 bg-card/70 p-3 text-center">
            <div className="flex justify-center text-primary">
              <Brain className="h-4 w-4" />
            </div>
            <div className="text-lg font-semibold text-foreground">{memoryVerses.length}</div>
            <CardDescription>Total verses memorised</CardDescription>
          </Card>
          <Card className="border-border/40 bg-card/70 p-3 text-center">
            <div className="flex justify-center text-accent">
              <Target className="h-4 w-4" />
            </div>
            <div className="text-lg font-semibold text-foreground">{averageInterval} days</div>
            <CardDescription>Average review interval</CardDescription>
          </Card>
          <Card className="border-border/40 bg-card/70 p-3 text-center">
            <div className="flex justify-center text-orange-500">
              <Calendar className="h-4 w-4" />
            </div>
            <div className="text-lg font-semibold text-foreground">{needsReviewCount}</div>
            <CardDescription>Ready for review</CardDescription>
          </Card>
        </div>

        <Input
          placeholder="Search memorised verses..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="bg-input-background border-border/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        {busy ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading memory verses...
          </div>
        ) : filteredVerses.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md text-center text-muted-foreground">
            <p className="text-sm">No memory verses yet. Add your first verse to begin a review rhythm.</p>
          </div>
        ) : (
          filteredVerses.map((verse, index) => (
            <motion.div
              key={verse.raw.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <Card className="border-border/40 bg-card/80 hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base text-primary">
                      {verse.referenceLabel ?? "Verse"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {verse.bookName}
                      {verse.raw.label ? ` • ${verse.raw.label}` : ""}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(verse.raw)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-foreground leading-relaxed">
                  <blockquote className="scripture-text italic text-muted-foreground">
                    “{verse.verseText || "Verse text not available yet."}”
                  </blockquote>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Next review: {verse.nextReviewLabel ?? "Scheduled"}
                    </span>
                    {typeof verse.raw.intervalDays === "number" ? (
                      <span>{verse.raw.intervalDays} day interval</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
