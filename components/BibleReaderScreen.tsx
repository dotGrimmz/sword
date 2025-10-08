"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MessageSquare,
  Settings,
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "./ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { LoadingScreen } from "@/components/LoadingScreen";
import { getChapterContent } from "@/lib/api/bible";
import { createUserNote } from "@/lib/api/notes";
import {
  deleteUserBookmark,
  getUserBookmarks,
  upsertUserBookmark, // This import is not used, but it's part of the original code.
} from "@/lib/api/bookmarks";
import type { BibleBookSummary, BibleVerse } from "@/types/bible";
import type { UserBookmark, UserHighlight } from "@/types/user";
import { useOfflineHighlights } from "@/components/useOfflineHighlights";
import { dispatchHighlightsUpdated, dispatchNotesUpdated } from "@/lib/events";
import styles from "./BibleReaderScreen.module.css";
import { useOfflineBookmarks } from "./useOfflineBookmarks";

interface BibleReaderScreenProps {
  onNavigate?: (screen: string) => void;
}

const HIGHLIGHT_COLOR = "yellow" as const;

export function BibleReaderScreen({ onNavigate }: BibleReaderScreenProps) {
  const {
    translations,
    translationCode,
    selectTranslation,
    books,
    isLoadingTranslations,
    isLoadingBooks,
  } = useTranslationContext();

  const handleNavigate = useCallback(
    (screen: string) => {
      onNavigate?.(screen);
    },
    [onNavigate]
  );

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [isLoadingChapter, setIsLoadingChapter] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const {
    highlights,
    isLoading: isLoadingHighlights,
    createHighlight,
    // The original code had a missing `createHighlight` property in the `useOfflineHighlights` hook.
    deleteHighlight,
  } = useOfflineHighlights();
  const {
    bookmarks,
    isLoading: isLoadingBookmarks,
    upsertBookmark,
    deleteBookmark,
  } = useOfflineBookmarks();

  const [highlightingVerse, setHighlightingVerse] = useState<number | null>(
    null
  );
  const [bookmarkingVerse, setBookmarkingVerse] = useState<number | null>(null);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteVerse, setNoteVerse] = useState<number | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const translationsByCode = useMemo(() => {
    const index = new Map<string, (typeof translations)[number]>();
    for (const translation of translations) {
      index.set(translation.code, translation);
    }
    return index;
  }, [translations]);

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

  const selectedBook = selectedBookId
    ? bookIndex.get(selectedBookId) ?? null
    : null;

  useEffect(() => {
    if (books.length === 0) {
      setSelectedBookId(null);
      return;
    }

    if (!selectedBookId || !bookIndex.has(selectedBookId)) {
      setSelectedBookId(books[0]!.id);
      setChapter(1);
    }
  }, [books, selectedBookId, bookIndex]);

  useEffect(() => {
    const loadChapter = async () => {
      if (!translationCode || !selectedBook) {
        setVerses([]);
        return;
      }

      setIsLoadingChapter(true);
      setChapterError(null);

      try {
        const response = await getChapterContent(
          translationCode,
          selectedBook.name,
          chapter
        );
        setVerses(response.verses);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load chapter";
        setChapterError(message);
        setVerses([]);
      } finally {
        setIsLoadingChapter(false);
      }
    };

    void loadChapter();
  }, [translationCode, selectedBook, chapter]);

  const highlightsForChapter = useMemo(() => {
    if (!selectedBookId) {
      return [] as UserHighlight[];
    }
    return highlights.filter(
      (highlight) =>
        highlight.bookId === selectedBookId && highlight.chapter === chapter
    ) as UserHighlight[];
  }, [highlights, selectedBookId, chapter]);

  const highlightsByVerse = useMemo(() => {
    const map = new Map<number, UserHighlight>();
    for (const highlight of highlightsForChapter) {
      const start = highlight.verseStart;
      const end = highlight.verseEnd;
      for (let verse = start; verse <= end; verse += 1) {
        map.set(verse, highlight);
      }
    }
    return map;
  }, [highlightsForChapter]);

  const currentBookmark = useMemo(() => {
    if (!selectedBookId) {
      return null;
    }
    return (
      bookmarks.find(
        (bookmark: any) =>
          bookmark.bookId === selectedBookId && bookmark.chapter === chapter
      ) ?? null
    );
  }, [bookmarks, selectedBookId, chapter]);

  const handleToggleHighlight = async (verseNumber: number) => {
    if (!selectedBookId) {
      toast.error("Pick a book before highlighting.");
      return;
    }

    setHighlightingVerse(verseNumber);
    const existingHighlight = highlightsByVerse.get(verseNumber);

    if (existingHighlight) {
      try {
        await deleteHighlight(existingHighlight.id);
        toast.success("Highlight removed");
        dispatchHighlightsUpdated({ source: "reader" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to remove highlight";
        toast.error(message);
      } finally {
        setHighlightingVerse(null);
      }
      return;
    }

    try {
      await createHighlight({
        bookId: selectedBookId,
        chapter,
        verseStart: verseNumber,
        verseEnd: verseNumber,
        color: HIGHLIGHT_COLOR,
        id: "",
        createdAt: null,
        updatedAt: null,
      });
      toast.success("Verse highlighted");
      dispatchHighlightsUpdated({ source: "reader" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to highlight verse";
      toast.error(message);
    } finally {
      setHighlightingVerse(null);
    }
  };

  const handleToggleBookmark = async (verseNumber: number) => {
    if (!selectedBookId) {
      toast.error("Pick a book before bookmarking.");
      return;
    }

    setBookmarkingVerse(verseNumber);

    if (currentBookmark && currentBookmark.verse === verseNumber) {
      try {
        await deleteBookmark(currentBookmark.id);
        toast.success("Bookmark removed");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to remove bookmark";
        toast.error(message);
      } finally {
        setBookmarkingVerse(null);
      }
      return;
    }

    try {
      await upsertBookmark({
        bookId: selectedBookId,
        chapter,
        verse: verseNumber,
      });

      toast.success("Bookmark saved");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save bookmark";
      toast.error(message);
    } finally {
      setBookmarkingVerse(null);
    }
  };

  const openNoteDialog = (verseNumber: number) => {
    setNoteVerse(verseNumber);
    setNoteBody("");
    setNoteError(null);
    setNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!translationCode || !selectedBookId || !noteVerse) {
      setNoteError("Select a verse before saving your note.");
      return;
    }

    const body = noteBody.trim();
    if (!body) {
      setNoteError("Write your reflection before saving.");
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);

    try {
      await createUserNote({
        translationId: translationCode,
        bookId: selectedBookId,
        chapter,
        verseStart: noteVerse,
        verseEnd: noteVerse,
        body,
      });
      toast.success("Note saved");
      setNoteDialogOpen(false);
      dispatchNotesUpdated({ source: "reader" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save note";
      toast.error(message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const goToPrevious = () => {
    if (!selectedBook) {
      return;
    }

    if (chapter > 1) {
      setChapter((value) => value - 1);
      return;
    }

    const currentIndex = books.findIndex((book) => book.id === selectedBook.id);
    if (currentIndex > 0) {
      const previousBook = books[currentIndex - 1]!;
      setSelectedBookId(previousBook.id);
      setChapter(previousBook.chapters);
    }
  };

  const goToNext = () => {
    if (!selectedBook) {
      return;
    }

    if (chapter < selectedBook.chapters) {
      setChapter((value) => value + 1);
      return;
    }

    const currentIndex = books.findIndex((book) => book.id === selectedBook.id);
    if (currentIndex >= 0 && currentIndex < books.length - 1) {
      const nextBook = books[currentIndex + 1]!;
      setSelectedBookId(nextBook.id);
      setChapter(1);
    }
  };

  const isBusy =
    isLoadingTranslations ||
    isLoadingBooks ||
    isLoadingChapter ||
    isLoadingHighlights ||
    isLoadingBookmarks;

  const translationLabel = translationCode
    ? translationsByCode.get(translationCode)?.name ?? translationCode
    : "Select translation";

  return (
    <div className={styles.readerPage}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.selectorGroup}>
            <Select
              value={translationCode ?? undefined}
              onValueChange={(value) => selectTranslation(value)}
            >
              <SelectTrigger
                className={clsx(
                  styles.selectTriggerBase,
                  styles.translationSelect
                )}
              >
                <SelectValue placeholder="Translation" />
              </SelectTrigger>
              <SelectContent className={styles.selectContent}>
                {translations.map((translation) => (
                  <SelectItem key={translation.code} value={translation.code}>
                    {translation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedBookId ?? undefined}
              onValueChange={(value) => {
                setSelectedBookId(value);
                setChapter(1);
              }}
              disabled={books.length === 0}
            >
              <SelectTrigger
                className={clsx(styles.selectTriggerBase, styles.bookSelect)}
              >
                <SelectValue placeholder="Book" />
              </SelectTrigger>
              <SelectContent className={styles.selectContent}>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={`${chapter}`}
              onValueChange={(value) => setChapter(Number.parseInt(value, 10))}
              disabled={!selectedBook}
            >
              <SelectTrigger
                className={clsx(styles.selectTriggerBase, styles.chapterSelect)}
              >
                <SelectValue placeholder="Chapter" />
              </SelectTrigger>
              <SelectContent className={styles.selectContent}>
                {selectedBook
                  ? Array.from(
                      { length: selectedBook.chapters },
                      (_, index) => index + 1
                    ).map((chapterNumber) => (
                      <SelectItem
                        key={chapterNumber}
                        value={`${chapterNumber}`}
                      >
                        {chapterNumber}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.navControls}>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              disabled={!selectedBook}
            >
              <ChevronLeft
                className={clsx(styles.navIcon, styles.navIconLeft)}
              />{" "}
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              disabled={!selectedBook}
            >
              Next{" "}
              <ChevronRight
                className={clsx(styles.navIcon, styles.navIconRight)}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate("settings")}
            >
              <Settings className={styles.navIcon} />
            </Button>
          </div>
        </div>
        <div className={styles.translationMeta}>
          {translationLabel}
          {selectedBook ? ` • ${selectedBook.name} ${chapter}` : ""}
        </div>
      </div>

      <div className={styles.readerContent}>
        {isBusy ? (
          <LoadingScreen
            variant="section"
            title="Loading Scripture…"
            subtitle="We’re fetching this passage and syncing your highlights."
          />
        ) : chapterError ? (
          <div className={clsx(styles.statusCard, styles.statusCardError)}>
            {chapterError}
          </div>
        ) : verses.length === 0 ? (
          <div className={clsx(styles.statusCard, styles.statusCardMuted)}>
            No verses available for this selection yet.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className={styles.verseList}
          >
            {verses.map((verse, index) => {
              const isHighlighted = highlightsByVerse.has(verse.verse);
              const isBookmarked = currentBookmark?.verse === verse.verse;

              return (
                <motion.div
                  key={verse.verse}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.02 }}
                  className={clsx(styles.verseCard, {
                    [styles.verseCardHighlighted]: isHighlighted,
                    [styles.verseCardHoverable]: !isHighlighted,
                  })}
                >
                  <div className={styles.verseContent}>
                    <span
                      className={clsx("scripture-text", styles.verseNumber)}
                    >
                      {verse.verse}
                    </span>
                    <p className={clsx("scripture-text", styles.verseText)}>
                      {verse.text}
                    </p>
                  </div>

                  <div
                    className={clsx(styles.verseActions, {
                      [styles.verseActionsVisible]: isHighlighted,
                    })}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className={styles.actionButton}
                      onClick={() => handleToggleHighlight(verse.verse)}
                      disabled={highlightingVerse === verse.verse}
                    >
                      {highlightingVerse === verse.verse ? (
                        <Loader2 className={styles.actionSpinner} />
                      ) : (
                        <Heart
                          className={clsx(styles.verseActionIcon, {
                            [styles.verseActionIconHighlighted]: isHighlighted,
                            [styles.verseActionIconMuted]: !isHighlighted,
                          })}
                        />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={styles.actionButton}
                      onClick={() => openNoteDialog(verse.verse)}
                    >
                      <MessageSquare
                        className={clsx(
                          styles.verseActionIcon,
                          styles.verseActionIconMuted
                        )}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={styles.actionButton}
                      onClick={() => handleToggleBookmark(verse.verse)}
                      disabled={bookmarkingVerse === verse.verse}
                    >
                      {bookmarkingVerse === verse.verse ? (
                        <Loader2 className={styles.actionSpinner} />
                      ) : (
                        <Bookmark
                          className={clsx(styles.verseActionIcon, {
                            [styles.bookmarkIconActive]: isBookmarked,
                            [styles.verseActionIconMuted]: !isBookmarked,
                          })}
                        />
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <Separator className={styles.sectionSeparator} />

        <Card className={styles.sessionCard}>
          <CardHeader>
            <CardTitle className={styles.sessionTitle}>
              Session overview
            </CardTitle>
          </CardHeader>
          <CardContent className={styles.sessionDetails}>
            <p>
              {translationLabel}
              {selectedBook ? ` • ${selectedBook.name}` : ""}
              {selectedBook ? ` (${selectedBook.chapters} chapters)` : ""}
            </p>
            <p>
              {highlightsForChapter.length} highlight
              {highlightsForChapter.length === 1 ? "" : "s"} in this chapter •{" "}
              {currentBookmark?.verse
                ? `Bookmarked verse ${currentBookmark.verse}`
                : "No bookmark yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Modal open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <ModalContent size="sm" className={styles.noteDialogContent}>
          <ModalHeader>
            <ModalTitle>
              {selectedBook
                ? `${selectedBook.name} ${chapter}:${noteVerse ?? ""}`
                : "New Note"}
            </ModalTitle>
          </ModalHeader>
          <ModalBody tight className={styles.dialogBody}>
            <Textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Capture your observation, prayer, or insight..."
              className={styles.noteTextarea}
            />
            {noteError ? <p className={styles.noteError}>{noteError}</p> : null}
            <div className={styles.dialogActions}>
              <Button variant="ghost" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className={styles.saveButton}
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? (
                  <Loader2 className={styles.saveButtonSpinner} />
                ) : null}
                Save Note
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
