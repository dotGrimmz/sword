"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  X,
} from "lucide-react";

import { useSearchParams } from "next/navigation";
import { useTranslationContext } from "./TranslationContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
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
import { AppHeaderToolbar } from "@/components/AppHeaderToolbar";
import bibleSelectStyles from "@/components/TranslationSwitcher.module.css";
import { buildReferenceLabel } from "@/lib/api/bible";
import { useChapterQuery } from "@/lib/query/bible";
import {
  useCreateHighlightMutation,
  useDeleteHighlightMutation,
  useHighlightsQuery,
} from "@/lib/query/highlights";
import {
  useBookmarksQuery,
  useDeleteBookmarkMutation,
  useUpsertBookmarkMutation,
} from "@/lib/query/bookmarks";
import { useCreateNoteMutation } from "@/lib/query/notes";
import { useReaderStore } from "@/lib/stores/reader-store";
import type { BibleBookSummary, BibleVerse } from "@/types/bible";
import type { UserBookmark, UserHighlight } from "@/types/user";
import styles from "./BibleReaderScreen.module.css";

const HIGHLIGHT_COLOR = "yellow" as const;
const normalizeBookInput = (value: string) =>
  value.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();

export function BibleReaderScreen() {
  const {
    translations,
    translationCode,
    books,
    isLoadingTranslations,
    isLoadingBooks,
  } = useTranslationContext();

  const selectedBookId = useReaderStore((state) => state.bookId);
  const chapter = useReaderStore((state) => state.chapter);
  const selectedVerse = useReaderStore((state) => state.selectedVerse);
  const hasHydrated = useReaderStore((state) => state._hasHydrated);
  const setChapter = useReaderStore((state) => state.setChapter);
  const setSelectedVerse = useReaderStore((state) => state.setSelectedVerse);
  const setPosition = useReaderStore((state) => state.setPosition);
  const applyFromQuery = useReaderStore((state) => state.applyFromQuery);
  const goToPreviousChapter = useReaderStore((state) => state.goToPrevious);
  const goToNextChapter = useReaderStore((state) => state.goToNext);

  const [highlightingVerse, setHighlightingVerse] = useState<number | null>(
    null
  );
  const [bookmarkingVerse, setBookmarkingVerse] = useState<number | null>(null);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteVerse, setNoteVerse] = useState<number | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const translationsByCode = useMemo(() => {
    const index = new Map<string, (typeof translations)[number]>();
    for (const translation of translations) {
      index.set(translation.code, translation);
    }
    return index;
  }, [translations]);

  const activeTranslation = translationCode
    ? translationsByCode.get(translationCode) ?? null
    : null;
  const activeTranslationId = activeTranslation?.id ?? null;

  const bookIndex = useMemo(() => {
    const index = new Map<string, BibleBookSummary>();
    for (const book of books) {
      index.set(book.id, book);
    }
    return index;
  }, [books]);

  const selectedBook = selectedBookId ? bookIndex.get(selectedBookId) ?? null : null;
  const skipVerseScrollRef = useRef(false);
  const queryAppliedRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const queryBookParam = searchParams?.get("book") ?? null;
  const queryChapterParam = searchParams?.get("chapter") ?? null;

  const chapterQuery = useChapterQuery(
    translationCode,
    selectedBook?.name,
    chapter,
  );
  const highlightsQuery = useHighlightsQuery(translationCode);
  const bookmarksQuery = useBookmarksQuery(translationCode);
  const createHighlightMutation = useCreateHighlightMutation(
    translationCode,
    "reader",
  );
  const deleteHighlightMutation = useDeleteHighlightMutation(
    translationCode,
    "reader",
  );
  const upsertBookmarkMutation = useUpsertBookmarkMutation(
    translationCode,
    "reader",
  );
  const deleteBookmarkMutation = useDeleteBookmarkMutation(
    translationCode,
    "reader",
  );
  const createNoteMutation = useCreateNoteMutation(translationCode, "reader");

  const verses = chapterQuery.data ?? [];
  const highlights = highlightsQuery.data ?? [];
  const bookmarks = bookmarksQuery.data ?? [];
  const isSavingNote = createNoteMutation.isPending;

  const chapterError = chapterQuery.isError
    ? chapterQuery.error instanceof Error
      ? chapterQuery.error.message
      : "Failed to load chapter"
    : null;

  useEffect(() => {
    if (!books.length) {
      return;
    }

    const rawBook = queryBookParam?.trim();
    const rawChapter = queryChapterParam?.trim();

    if (!rawBook && !rawChapter) {
      queryAppliedRef.current = null;
      return;
    }

    if (!rawBook) {
      return;
    }

    const normalizedBook = normalizeBookInput(rawBook);
    const normalizedCollapsed = normalizedBook.replace(/ /g, "");
    const queryKey = `${normalizedBook}|${rawChapter ?? ""}`;

    if (queryAppliedRef.current === queryKey) {
      return;
    }

    const matchingBook =
      books.find((book) => {
        const bookName = normalizeBookInput(book.name);
        const bookAbbrev = book.abbreviation
          ? normalizeBookInput(book.abbreviation)
          : null;
        const nameCollapsed = bookName.replace(/ /g, "");
        const abbrevCollapsed = bookAbbrev
          ? bookAbbrev.replace(/ /g, "")
          : null;
        return (
          bookName === normalizedBook ||
          nameCollapsed === normalizedCollapsed ||
          (bookAbbrev && bookAbbrev === normalizedBook) ||
          (abbrevCollapsed && abbrevCollapsed === normalizedCollapsed)
        );
      }) ?? null;

    if (!matchingBook) {
      return;
    }

    let requestedChapter = rawChapter ? Number.parseInt(rawChapter, 10) : 1;
    if (!Number.isFinite(requestedChapter)) {
      requestedChapter = 1;
    }
    requestedChapter = Math.min(
      Math.max(1, requestedChapter),
      matchingBook.chapters
    );

    applyFromQuery(matchingBook.id, requestedChapter);
    queryAppliedRef.current = queryKey;
  }, [applyFromQuery, books, queryBookParam, queryChapterParam]);

  useEffect(() => {
    if (!hasHydrated || books.length === 0) {
      return;
    }

    if (queryBookParam?.trim()) {
      return;
    }

    if (selectedBookId && bookIndex.has(selectedBookId)) {
      const book = bookIndex.get(selectedBookId)!;
      if (chapter < 1 || chapter > book.chapters) {
        setChapter(1);
      }
      return;
    }

    const firstBook = books[0]!;
    setPosition(firstBook.id, 1);
  }, [selectedBookId, bookIndex, books, chapter, hasHydrated, queryBookParam, setChapter, setPosition]);

  useEffect(() => {
    setSelectedVerse(1);
    skipVerseScrollRef.current = true;
  }, [chapter, selectedBookId, setSelectedVerse]);

  useEffect(() => {
    if (verses.length === 0) {
      return;
    }

    if (!verses.some((verse) => verse.verse === selectedVerse)) {
      skipVerseScrollRef.current = true;
      setSelectedVerse(verses[0]!.verse);
      return;
    }

    if (skipVerseScrollRef.current) {
      skipVerseScrollRef.current = false;
      return;
    }

    const verseElement = document.getElementById(`reader-verse-${selectedVerse}`);
    verseElement?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedVerse, verses, setSelectedVerse]);

  const highlightsForChapter = useMemo(() => {
    if (!selectedBookId) {
      return [] as UserHighlight[];
    }
    return highlights.filter(
      (highlight) => highlight.bookId === selectedBookId && highlight.chapter === chapter,
    );
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
        (bookmark) =>
          bookmark.bookId === selectedBookId && bookmark.chapter === chapter
      ) ?? null
    );
  }, [bookmarks, selectedBookId, chapter]);

  const bookmarkEntries = useMemo(() => {
    return [...bookmarks]
      .map((bookmark) => {
        const book = bookmark.bookId
          ? bookIndex.get(bookmark.bookId)
          : undefined;
        const label =
          buildReferenceLabel(
            book,
            bookmark.chapter,
            bookmark.verse,
            bookmark.verse,
          ) ??
          bookmark.label ??
          "Saved place";
        const isActive =
          bookmark.bookId === selectedBookId &&
          bookmark.chapter === chapter &&
          (bookmark.verse == null || bookmark.verse === selectedVerse);
        return { bookmark, label, isActive };
      })
      .sort((left, right) => {
        const leftTime = new Date(left.bookmark.createdAt ?? 0).getTime();
        const rightTime = new Date(right.bookmark.createdAt ?? 0).getTime();
        return rightTime - leftTime;
      });
  }, [bookmarks, bookIndex, selectedBookId, chapter, selectedVerse]);

  const handleOpenBookmark = (bookmark: UserBookmark) => {
    if (!bookmark.bookId || !bookmark.chapter) {
      toast.error("This bookmark is missing a passage.");
      return;
    }
    setPosition(bookmark.bookId, bookmark.chapter);
    if (bookmark.verse && bookmark.verse >= 1) {
      setSelectedVerse(bookmark.verse);
    }
    setBookmarksOpen(false);
  };

  useEffect(() => {
    if (!bookmarksOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBookmarksOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bookmarksOpen]);

  const handleToggleHighlight = async (verseNumber: number) => {
    if (!selectedBookId) {
      toast.error("Pick a book before marking.");
      return;
    }

    if (!translationCode) {
      toast.error("Select a translation before marking.");
      return;
    }

    setHighlightingVerse(verseNumber);
    const existingHighlight = highlightsByVerse.get(verseNumber);

    if (existingHighlight) {
      try {
        await deleteHighlightMutation.mutateAsync(existingHighlight);
        toast.success("Removed from favorites");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to remove mark";
        toast.error(message);
      } finally {
        setHighlightingVerse(null);
      }
      return;
    }

    try {
      await createHighlightMutation.mutateAsync({
        translationId: activeTranslationId ?? translationCode,
        bookId: selectedBookId,
        chapter,
        verseStart: verseNumber,
        verseEnd: verseNumber,
        color: HIGHLIGHT_COLOR,
      });
      toast.success("Added to favorites");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to mark verse";
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

    if (!translationCode) {
      toast.error("Select a translation before bookmarking.");
      return;
    }

    setBookmarkingVerse(verseNumber);

    if (currentBookmark && currentBookmark.verse === verseNumber) {
      try {
        await deleteBookmarkMutation.mutateAsync(currentBookmark);
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
      await upsertBookmarkMutation.mutateAsync({
        translationId: activeTranslationId ?? translationCode,
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

    setNoteError(null);

    try {
      await createNoteMutation.mutateAsync({
        translationId: activeTranslationId ?? translationCode,
        bookId: selectedBookId,
        chapter,
        verseStart: noteVerse,
        verseEnd: noteVerse,
        body,
      });
      toast.success("Reflection saved");
      setNoteDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save note";
      toast.error(message);
    }
  };

  const goToPrevious = () => {
    if (!selectedBook) {
      return;
    }
    goToPreviousChapter(books, selectedBook.id);
  };

  const goToNext = () => {
    if (!selectedBook) {
      return;
    }
    goToNextChapter(books, selectedBook.id);
  };

  const isBusy =
    isLoadingTranslations ||
    isLoadingBooks ||
    chapterQuery.isLoading ||
    highlightsQuery.isLoading ||
    bookmarksQuery.isLoading;

  const translationLabel =
    activeTranslation?.name ?? translationCode ?? "Select translation";

  const bookmarksPortal =
    hasMounted &&
    createPortal(
      <>
        <button
          type="button"
          className={styles.bookmarkSideTab}
          aria-label={`Open bookmarks (${bookmarks.length})`}
          title="Bookmarks"
          onClick={() => setBookmarksOpen(true)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Bookmark
            className={styles.bookmarkSideTabIcon}
            aria-hidden="true"
          />
          <span className={styles.bookmarkSideTabCount}>
            {bookmarks.length}
          </span>
        </button>
        {bookmarksOpen ? (
          <>
            <button
              type="button"
              className={styles.bookmarkDrawerOverlay}
              aria-label="Close bookmarks"
              onClick={() => setBookmarksOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="bookmarks-drawer-title"
              className={styles.bookmarkDrawer}
            >
              <div className={styles.bookmarkSheetHeader}>
                <div className={styles.bookmarkSheetHeaderRow}>
                  <h2
                    id="bookmarks-drawer-title"
                    className={styles.bookmarkSheetTitle}
                  >
                    Bookmarks
                  </h2>
                  <button
                    type="button"
                    className={styles.bookmarkDrawerClose}
                    aria-label="Close bookmarks"
                    onClick={() => setBookmarksOpen(false)}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>
                <p className={styles.bookmarkSheetDescription}>
                  Jump back to any place you&apos;ve saved in Scripture.
                </p>
              </div>
              <div className={styles.bookmarkDrawerBody}>
                {bookmarkEntries.length === 0 ? (
                  <p className={styles.bookmarkSheetEmpty}>
                    No bookmarks yet. Tap the bookmark icon on a verse to save
                    your place.
                  </p>
                ) : (
                  <ul className={styles.bookmarkSheetList}>
                    {bookmarkEntries.map(({ bookmark, label, isActive }) => (
                      <li key={bookmark.id}>
                        <button
                          type="button"
                          className={clsx(styles.bookmarkSheetItem, {
                            [styles.bookmarkSheetItemActive]: isActive,
                          })}
                          onClick={() => handleOpenBookmark(bookmark)}
                        >
                          <span className={styles.bookmarkSheetRef}>
                            {label}
                          </span>
                          {bookmark.label ? (
                            <span className={styles.bookmarkSheetMeta}>
                              {bookmark.label}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : null}
      </>,
      document.body,
    );

  return (
    <div className={styles.readerPage}>
      {bookmarksPortal}

      <div className={styles.readerScroll}>
      <div className={styles.toolbar}>
        <div className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <Select
              value={selectedBookId ?? undefined}
              onValueChange={(value) => {
                setPosition(value, 1);
              }}
              disabled={books.length === 0}
            >
              <SelectTrigger
                className={clsx(styles.selectTriggerBase, styles.titleSelect)}
                aria-label="Choose book"
              >
                <SelectValue placeholder="Scripture" />
              </SelectTrigger>
              <SelectContent
                className={bibleSelectStyles.selectContent}
                sideOffset={6}
              >
                {books.map((book) => (
                  <SelectItem
                    key={book.id}
                    value={book.id}
                    className={bibleSelectStyles.selectItem}
                  >
                    {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AppHeaderToolbar />
        </div>

        <div className={styles.chapterVerseRow}>
          <div className={styles.passageField}>
            <span className={styles.passageLabel}>Chapter</span>
            <Select
              value={`${chapter}`}
              onValueChange={(value) => setChapter(Number.parseInt(value, 10))}
              disabled={!selectedBook}
            >
              <SelectTrigger
                className={clsx(
                  styles.selectTriggerBase,
                  styles.passageSelect,
                  styles.chapterSelect,
                )}
                aria-label="Choose chapter"
              >
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className={styles.selectContent} sideOffset={6}>
                {selectedBook
                  ? Array.from(
                      { length: selectedBook.chapters },
                      (_, index) => index + 1,
                    ).map((chapterNumber) => (
                      <SelectItem
                        key={chapterNumber}
                        value={`${chapterNumber}`}
                        className={styles.selectItem}
                      >
                        Chapter {chapterNumber}
                      </SelectItem>
                    ))
                  : null}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.passageField}>
            <span className={styles.passageLabel}>Verse</span>
            <Select
              value={`${selectedVerse}`}
              onValueChange={(value) =>
                setSelectedVerse(Number.parseInt(value, 10))
              }
              disabled={!selectedBook || verses.length === 0}
            >
              <SelectTrigger
                className={clsx(
                  styles.selectTriggerBase,
                  styles.passageSelect,
                  styles.verseSelect,
                )}
                aria-label="Choose verse"
              >
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent className={styles.selectContent} sideOffset={6}>
                {verses.map((verse) => (
                  <SelectItem
                    key={verse.verse}
                    value={`${verse.verse}`}
                    className={styles.selectItem}
                  >
                    Verse {verse.verse}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={styles.navControls}>
          <Button
            variant="ghost"
            size="nav"
            onClick={goToPrevious}
            disabled={!selectedBook}
            className={styles.navControlButton}
          >
            <ChevronLeft className={clsx(styles.navIcon, styles.navIconLeft)} />{" "}
            Previous
          </Button>
          <Button
            variant="ghost"
            size="nav"
            onClick={goToNext}
            disabled={!selectedBook}
            className={styles.navControlButton}
          >
            Next{" "}
            <ChevronRight className={clsx(styles.navIcon, styles.navIconRight)} />
          </Button>
        </div>
      </div>

      <div className={styles.readerContent}>
        {isBusy ? (
          <LoadingScreen
            variant="section"
            title="Loading Scripture…"
            subtitle="We’re fetching this passage and syncing your favorites."
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
                  id={`reader-verse-${verse.verse}`}
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
                      aria-label={
                        isHighlighted
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
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
              {highlightsForChapter.length} favorite
              {highlightsForChapter.length === 1 ? "" : "s"} in this chapter •{" "}
              {currentBookmark?.verse
                ? `Bookmarked verse ${currentBookmark.verse}`
                : "No bookmark yet"}
            </p>
          </CardContent>
        </Card>

        <div className={clsx(styles.navControls, styles.navControlsBottom)}>
          <Button
            variant="ghost"
            size="nav"
            onClick={goToPrevious}
            disabled={!selectedBook}
            className={styles.navControlButton}
          >
            <ChevronLeft
              className={clsx(styles.navIcon, styles.navIconLeft)}
            />{" "}
            Previous
          </Button>
          <Button
            variant="ghost"
            size="nav"
            onClick={goToNext}
            disabled={!selectedBook}
            className={styles.navControlButton}
          >
            Next{" "}
            <ChevronRight
              className={clsx(styles.navIcon, styles.navIconRight)}
            />
          </Button>
        </div>
      </div>
      </div>

      <Modal open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <ModalContent size="sm" className={styles.noteDialogContent}>
          <ModalHeader>
            <ModalTitle>
              {selectedBook
                ? `${selectedBook.name} ${chapter}:${noteVerse ?? ""}`
                : "New Reflection"}
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
                Save Reflection
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
