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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import {
  getChapterContent,
} from "@/lib/api/bible";
import {
  createUserHighlight,
  deleteUserHighlight,
  getUserHighlights,
} from "@/lib/api/highlights";
import { createUserNote } from "@/lib/api/notes";
import {
  deleteUserBookmark,
  getUserBookmarks,
  upsertUserBookmark,
} from "@/lib/api/bookmarks";
import type { BibleBookSummary, BibleVerse } from "@/types/bible";
import type { UserBookmark, UserHighlight } from "@/types/user";
import { dispatchHighlightsUpdated, dispatchNotesUpdated } from "@/lib/events";

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

  const [highlights, setHighlights] = useState<UserHighlight[]>([]);
  const [bookmarks, setBookmarks] = useState<UserBookmark[]>([]);

  const [isLoadingHighlights, setIsLoadingHighlights] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);

  const [highlightingVerse, setHighlightingVerse] = useState<number | null>(null);
  const [bookmarkingVerse, setBookmarkingVerse] = useState<number | null>(null);

  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteVerse, setNoteVerse] = useState<number | null>(null);
  const [noteBody, setNoteBody] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const translationsByCode = useMemo(() => {
    const index = new Map<string, typeof translations[number]>();
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

  const selectedBook = selectedBookId ? bookIndex.get(selectedBookId) ?? null : null;

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
        const response = await getChapterContent(translationCode, selectedBook.name, chapter);
        setVerses(response.verses);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load chapter";
        setChapterError(message);
        setVerses([]);
      } finally {
        setIsLoadingChapter(false);
      }
    };

    void loadChapter();
  }, [translationCode, selectedBook, chapter]);

  useEffect(() => {
    const loadHighlights = async () => {
      setIsLoadingHighlights(true);
      try {
        const data = await getUserHighlights();
        setHighlights(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load highlights";
        toast.error(message);
        setHighlights([]);
      } finally {
        setIsLoadingHighlights(false);
      }
    };

    void loadHighlights();
  }, []);

  useEffect(() => {
    const loadBookmarks = async () => {
      setIsLoadingBookmarks(true);
      try {
        const data = await getUserBookmarks();
        setBookmarks(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load bookmarks";
        toast.error(message);
        setBookmarks([]);
      } finally {
        setIsLoadingBookmarks(false);
      }
    };

    void loadBookmarks();
  }, []);

  const highlightsForChapter = useMemo(() => {
    if (!selectedBookId) {
      return [] as UserHighlight[];
    }
    return highlights.filter(
      (highlight) =>
        highlight.bookId === selectedBookId &&
        highlight.chapter === chapter
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

  const handleToggleHighlight = async (verseNumber: number) => {
    if (!selectedBookId) {
      toast.error("Pick a book before highlighting.");
      return;
    }

    setHighlightingVerse(verseNumber);
    const existingHighlight = highlightsByVerse.get(verseNumber);

    if (existingHighlight) {
      const previous = highlights;
      setHighlights((prev) => prev.filter((item) => item.id !== existingHighlight.id));
      try {
        await deleteUserHighlight(existingHighlight.id);
        toast.success("Highlight removed");
        dispatchHighlightsUpdated({ source: "reader" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to remove highlight";
        toast.error(message);
        setHighlights(previous);
      } finally {
        setHighlightingVerse(null);
      }
      return;
    }

    try {
      const newHighlight = await createUserHighlight({
        bookId: selectedBookId,
        chapter,
        verseStart: verseNumber,
        verseEnd: verseNumber,
        color: HIGHLIGHT_COLOR,
      });
      setHighlights((prev) => [newHighlight, ...prev]);
      toast.success("Verse highlighted");
      dispatchHighlightsUpdated({ source: "reader" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to highlight verse";
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
      const previous = bookmarks;
      setBookmarks((prev) => prev.filter((item) => item.id !== currentBookmark.id));
      try {
        await deleteUserBookmark(currentBookmark.id);
        toast.success("Bookmark removed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to remove bookmark";
        toast.error(message);
        setBookmarks(previous);
      } finally {
        setBookmarkingVerse(null);
      }
      return;
    }

    try {
      const bookmark = await upsertUserBookmark({
        bookId: selectedBookId,
        chapter,
        verse: verseNumber,
      });

      setBookmarks((prev) => {
        const others = prev.filter(
          (item) => item.bookId !== selectedBookId || item.chapter !== chapter
        );
        return [bookmark, ...others];
      });

      toast.success("Bookmark saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save bookmark";
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
      const message = error instanceof Error ? error.message : "Unable to save note";
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
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={translationCode ?? undefined}
              onValueChange={(value) => selectTranslation(value)}
            >
              <SelectTrigger className="w-44 bg-input-background border-border/50">
                <SelectValue placeholder="Translation" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
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
              <SelectTrigger className="w-40 bg-input-background border-border/50">
                <SelectValue placeholder="Book" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
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
              <SelectTrigger className="w-24 bg-input-background border-border/50">
                <SelectValue placeholder="Chapter" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {selectedBook
                  ? Array.from({ length: selectedBook.chapters }, (_, index) => index + 1).map(
                      (chapterNumber) => (
                        <SelectItem key={chapterNumber} value={`${chapterNumber}`}>
                          {chapterNumber}
                        </SelectItem>
                      )
                    )
                  : null}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <Button variant="ghost" size="sm" onClick={goToPrevious} disabled={!selectedBook}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <Button variant="ghost" size="sm" onClick={goToNext} disabled={!selectedBook}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleNavigate("settings")}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {translationLabel}
          {selectedBook ? ` • ${selectedBook.name} ${chapter}` : ""}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {isBusy ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Scripture...
          </div>
        ) : chapterError ? (
          <div className="mx-auto max-w-md rounded-lg border border-border/40 bg-card/80 p-6 text-center text-sm text-destructive">
            {chapterError}
          </div>
        ) : verses.length === 0 ? (
          <div className="mx-auto max-w-md rounded-lg border border-border/40 bg-card/80 p-6 text-center text-sm text-muted-foreground">
            No verses available for this selection yet.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
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
                  className={`group relative rounded-lg border border-transparent p-4 transition-colors duration-200 ${
                    isHighlighted ? "border-accent bg-accent/20" : "hover:bg-card/60"
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="scripture-text min-w-[2rem] text-sm font-medium text-primary">
                      {verse.verse}
                    </span>
                    <p className="scripture-text flex-1 text-base leading-relaxed text-foreground">
                      {verse.text}
                    </p>
                  </div>

                  <div
                    className={`absolute right-2 top-2 flex items-center gap-1 rounded-full bg-card/80 px-1.5 py-1 text-muted-foreground shadow transition-opacity ${
                      isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleToggleHighlight(verse.verse)}
                      disabled={highlightingVerse === verse.verse}
                    >
                      {highlightingVerse === verse.verse ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            isHighlighted ? "fill-accent text-accent" : "text-muted-foreground"
                          }`}
                        />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => openNoteDialog(verse.verse)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleToggleBookmark(verse.verse)}
                      disabled={bookmarkingVerse === verse.verse}
                    >
                      {bookmarkingVerse === verse.verse ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Bookmark
                          className={`h-3.5 w-3.5 ${
                            isBookmarked ? "fill-primary text-primary" : "text-muted-foreground"
                          }`}
                        />
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <Separator className="my-8" />

        <Card className="border-border/50 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base text-primary">Session overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {translationLabel}
              {selectedBook ? ` • ${selectedBook.name}` : ""}
              {selectedBook ? ` (${selectedBook.chapters} chapters)` : ""}
            </p>
            <p>
              {highlightsForChapter.length} highlight
              {highlightsForChapter.length === 1 ? "" : "s"} in this chapter •
              {" "}
              {currentBookmark?.verse
                ? `Bookmarked verse ${currentBookmark.verse}`
                : "No bookmark yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="w-[92vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedBook ? `${selectedBook.name} ${chapter}:${noteVerse ?? ""}` : "New Note"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Capture your observation, prayer, or insight..."
              className="min-h-[160px] bg-input-background border-border/50"
            />
            {noteError ? <p className="text-sm text-destructive">{noteError}</p> : null}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setNoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleSaveNote}
                disabled={isSavingNote}
              >
                {isSavingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
