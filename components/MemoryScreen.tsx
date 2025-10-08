"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Brain,
  Calendar,
  Loader2,
  Plus,
  Target,
  Trash2,
  Sparkles,
  BookOpen,
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "./ui/modal";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { buildReferenceLabel, getPassage } from "@/lib/api/bible";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  createUserMemoryVerse,
  deleteUserMemoryVerse,
  getUserMemoryVerses,
} from "@/lib/api/memory";
import type { BibleBookSummary } from "@/types/bible";
import type { UserMemoryVerse } from "@/types/user";
import { MEMORY_UPDATED_EVENT, dispatchMemoryUpdated } from "@/lib/events";
import styles from "./MemoryScreen.module.css";

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

  const { books, translationCode, isLoadingTranslations, isLoadingBooks } =
    useTranslationContext();

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
      const message =
        error instanceof Error ? error.message : "Failed to load memory verses";
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
        (verse.referenceLabel &&
          verse.referenceLabel.toLowerCase().includes(query)) ||
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
    const sum = memoryVerses.reduce(
      (accumulator, verse) => accumulator + (verse.intervalDays ?? 0),
      0
    );
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
      const message =
        error instanceof Error ? error.message : "Unable to save memory verse";
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
      const message =
        error instanceof Error
          ? error.message
          : "Unable to remove memory verse";
      toast.error(message);
      setMemoryVerses(previous);
    }
  };

  const selectedBook = createBookId ? bookIndex.get(createBookId) : null;
  const chapterCount = selectedBook?.chapters ?? 1;

  const busy = isLoading || isLoadingTranslations || isLoadingBooks;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerBar}>
          <div>
            <h1 className={styles.headerTitle}>Memory Verses</h1>
            <p className={styles.headerMeta}>
              {memoryVerses.length} saved • {needsReviewCount} ready for review
            </p>
          </div>
          <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <ModalTrigger asChild>
              <Button
                size="sm"
                className={styles.addButton}
                disabled={books.length === 0}
              >
                <Plus className={styles.addButtonIcon} /> Add Verse
              </Button>
            </ModalTrigger>
            <ModalContent size="md">
              <ModalHeader className={styles.dialogHeader}>
                <ModalTitle>Add Memory Verse</ModalTitle>
                <ModalDescription className={styles.dialogDescription}>
                  Capture a passage and we&apos;ll schedule it into your review
                  rhythm automatically.
                </ModalDescription>
              </ModalHeader>

              <ModalBody>
                <motion.div
                  className={styles.dialogHero}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <span className={styles.dialogHeroIcon}>
                    <Sparkles aria-hidden="true" />
                  </span>
                  <div>
                    <p className={styles.dialogHeroTitle}>
                      Build your verse library
                    </p>
                    <p className={styles.dialogHeroSubtitle}>
                      Keep passages close at hand and let spaced repetition do
                      the heavy lifting.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  className={styles.dialogMetaRow}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut", delay: 0.05 }}
                >
                  <div className={styles.dialogMetaTile}>
                    <Brain
                      className={styles.dialogMetaIcon}
                      aria-hidden="true"
                    />
                    <div>
                      <p className={styles.dialogMetaLabel}>In rotation</p>
                      <p className={styles.dialogMetaValue}>
                        {memoryVerses.length} verses
                      </p>
                    </div>
                  </div>
                  <div className={styles.dialogMetaTile}>
                    <Calendar
                      className={styles.dialogMetaIcon}
                      aria-hidden="true"
                    />
                    <div>
                      <p className={styles.dialogMetaLabel}>Ready today</p>
                      <p className={styles.dialogMetaValue}>
                        {needsReviewCount} for review
                      </p>
                    </div>
                  </div>
                  <div className={styles.dialogMetaTile}>
                    <BookOpen
                      className={styles.dialogMetaIcon}
                      aria-hidden="true"
                    />
                    <div>
                      <p className={styles.dialogMetaLabel}>Translation</p>
                      <p className={styles.dialogMetaValue}>
                        {translationCode?.toUpperCase() ?? "Choose one"}
                      </p>
                    </div>
                  </div>
                </motion.div>

                <div className={styles.dialogDivider} />

                <div className={styles.formStack}>
                  <motion.div
                    className={`${styles.fieldGrid} ${styles.fieldGridTwoColumns}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.28,
                      ease: "easeOut",
                      delay: 0.08,
                    }}
                  >
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Book</span>
                      <Select
                        value={createBookId ?? undefined}
                        onValueChange={(value) => {
                          setCreateBookId(value);
                          setCreateChapter("1");
                          setCreateVerseStart("1");
                          setCreateVerseEnd("1");
                        }}
                      >
                        <SelectTrigger className={styles.selectTrigger}>
                          <SelectValue placeholder="Select book" />
                        </SelectTrigger>
                        <SelectContent className={styles.selectContent}>
                          {books.map((book) => (
                            <SelectItem
                              key={book.id}
                              value={book.id}
                              className={styles.selectItem}
                            >
                              {book.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className={styles.dialogHint}>
                        {books.length > 0
                          ? `${books.length} books available in ${
                              translationCode?.toUpperCase() ?? "your library"
                            }`
                          : "Books will appear once a translation is loaded."}
                      </p>
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Chapter</span>
                      <Select
                        value={createChapter}
                        onValueChange={(value) => {
                          setCreateChapter(value);
                          setCreateVerseStart("1");
                          setCreateVerseEnd("1");
                        }}
                      >
                        <SelectTrigger className={styles.selectTrigger}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={styles.selectContent}>
                          {Array.from(
                            { length: chapterCount },
                            (_, index) => index + 1
                          ).map((chapterNumber) => (
                            <SelectItem
                              key={chapterNumber}
                              value={`${chapterNumber}`}
                              className={styles.selectItem}
                            >
                              {chapterNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className={styles.dialogHint}>
                        {selectedBook
                          ? `${selectedBook.chapters} chapters total`
                          : "Pick a book to see chapter options."}
                      </p>
                    </div>
                  </motion.div>
                  <motion.div
                    className={`${styles.fieldGrid} ${styles.fieldGridTwoColumns}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.28,
                      ease: "easeOut",
                      delay: 0.12,
                    }}
                  >
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Verse start</span>
                      <Input
                        type="number"
                        min={1}
                        value={createVerseStart}
                        onChange={(event) =>
                          setCreateVerseStart(event.target.value)
                        }
                        className={styles.input}
                      />
                      <p className={styles.dialogHint}>
                        We&apos;ll fetch the verse text automatically.
                      </p>
                    </div>
                    <div className={styles.fieldGroup}>
                      <span className={styles.fieldLabel}>Verse end</span>
                      <Input
                        type="number"
                        min={createVerseStart}
                        value={createVerseEnd}
                        onChange={(event) =>
                          setCreateVerseEnd(event.target.value)
                        }
                        className={styles.input}
                      />
                      <p className={styles.dialogHint}>
                        Use the same number to capture a single verse.
                      </p>
                    </div>
                  </motion.div>
                  <motion.div
                    className={styles.fieldGroup}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.28,
                      ease: "easeOut",
                      delay: 0.16,
                    }}
                  >
                    <span className={styles.fieldLabel}>Reflection label</span>
                    <Input
                      placeholder="Optional descriptor to help you find this later"
                      value={createLabel}
                      onChange={(event) => setCreateLabel(event.target.value)}
                      className={styles.input}
                    />
                    <p className={styles.dialogHint}>
                      Try something memorable like “Daily strength” or “Peace in
                      storms”.
                    </p>
                  </motion.div>
                  <motion.p
                    className={styles.dialogHint}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    Verses are scheduled automatically using spaced repetition.
                  </motion.p>
                  {createError ? (
                    <motion.p
                      className={styles.errorMessage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {createError}
                    </motion.p>
                  ) : null}
                  <motion.div
                    className={styles.saveButtonWrap}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, ease: "easeOut", delay: 0.2 }}
                  >
                    <Button
                      className={styles.saveButton}
                      onClick={handleCreate}
                      disabled={isSavingCreate}
                    >
                      {isSavingCreate ? (
                        <Loader2 className={styles.spinner} />
                      ) : null}
                      Save Memory Verse
                    </Button>
                    <p className={styles.dialogTip}>
                      Tip: add labels so you can theme verses around topics or
                      seasons.
                    </p>
                  </motion.div>
                </div>
              </ModalBody>
            </ModalContent>
          </Modal>
        </div>

        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <div className={styles.statIcon}>
              <Brain />
            </div>
            <div className={styles.statValue}>{memoryVerses.length}</div>
            <CardDescription>Total verses memorised</CardDescription>
          </Card>
          <Card className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconAccent}`}>
              <Target />
            </div>
            <div className={styles.statValue}>{averageInterval} days</div>
            <CardDescription>Average review interval</CardDescription>
          </Card>
          <Card className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
              <Calendar />
            </div>
            <div className={styles.statValue}>{needsReviewCount}</div>
            <CardDescription>Ready for review</CardDescription>
          </Card>
        </div>

        <Input
          placeholder="Search memorised verses..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.listArea}>
        {busy ? (
          <LoadingScreen
            variant="section"
            title="Loading memory verses…"
            subtitle="We’re syncing your memorised passages and review schedule."
          />
        ) : filteredVerses.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyBadge}>
              <Image
                src="/sword_logo.png"
                alt="Sword logo"
                width={84}
                height={84}
                className={styles.emptyBadgeImage}
              />
            </div>
            <h3 className={styles.emptyTitle}>Build your first memory verse</h3>
            <p className={styles.emptyCopy}>
              Add a passage to start your spaced repetition rhythm and watch
              this list fill up.
            </p>
          </div>
        ) : (
          filteredVerses.map((verse, index) => (
            <motion.div
              key={verse.raw.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
            >
              <Card className={styles.verseCard}>
                <CardHeader className={styles.verseHeader}>
                  <div>
                    <CardTitle className={styles.verseTitle}>
                      {verse.referenceLabel ?? "Verse"}
                    </CardTitle>
                    <CardDescription className={styles.verseSubtitle}>
                      {verse.bookName}
                      {verse.raw.label ? ` • ${verse.raw.label}` : ""}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.deleteButton}
                    onClick={() => handleDelete(verse.raw)}
                  >
                    <Trash2 className={styles.deleteIcon} />
                  </Button>
                </CardHeader>
                <CardContent className={styles.verseContent}>
                  <blockquote className={`${styles.verseQuote} scripture-text`}>
                    “{verse.verseText || "Verse text not available yet."}”
                  </blockquote>
                  <div className={styles.metaRow}>
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
