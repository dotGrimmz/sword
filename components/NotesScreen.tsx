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
  Calendar,
  Edit,
  Loader2,
  Plus,
  Search,
  Trash2,
  BookOpen,
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { buildReferenceLabel, getPassage } from "@/lib/api/bible";
import {
  createUserNote,
  deleteUserNote,
  getUserNotes,
  updateUserNote,
} from "@/lib/api/notes";
import type { BibleBookSummary } from "@/types/bible";
import type { UserNote } from "@/types/user";
import { NOTES_UPDATED_EVENT, dispatchNotesUpdated } from "@/lib/events";

interface NotesScreenProps {
  onNavigate?: (screen: string) => void;
}

type DerivedNote = {
  raw: UserNote;
  title: string;
  body: string;
  referenceLabel: string | null;
  verseText: string | null;
  dateLabel: string | null;
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

const extractTitle = (body: string) => {
  const trimmed = body.trim();
  if (!trimmed) {
    return "Untitled note";
  }

  const [firstLine] = trimmed.split(/\n+/);
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
};

const normaliseBody = (body: string) => body.trim();

export function NotesScreen({ onNavigate }: NotesScreenProps = {}) {
  void onNavigate;

  const {
    books,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createBookId, setCreateBookId] = useState<string | null>(null);
  const [createChapter, setCreateChapter] = useState("1");
  const [createVerseStart, setCreateVerseStart] = useState("1");
  const [createVerseEnd, setCreateVerseEnd] = useState("1");
  const [createBody, setCreateBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSavingCreate, setIsSavingCreate] = useState(false);

  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});
  const verseTextsRef = useRef(verseTexts);
  const pendingVerseFetches = useRef(new Set<string>());

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
    setCreateBody("");
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

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetched = await getUserNotes();
      setNotes(fetched);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load notes";
      toast.error(message);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler: EventListener = (event) => {
      const custom = event as CustomEvent<{ source?: string }>;

      if (custom.detail?.source === "notes-screen") {
        return;
      }

      void loadNotes();
    };

    window.addEventListener(NOTES_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handler);
    };
  }, [loadNotes]);

  useEffect(() => {
    if (!translationCode) {
      return;
    }

    for (const note of notes) {
      const key = note.id;
      if (verseTextsRef.current[key] !== undefined) {
        continue;
      }

      if (pendingVerseFetches.current.has(key)) {
        continue;
      }

      const bookId = note.bookId ?? undefined;
      const chapter = note.chapter ?? undefined;
      const verseStart = note.verseStart ?? undefined;

      if (!bookId || !chapter || !verseStart) {
        setVerseTexts((prev) => ({ ...prev, [key]: "" }));
        continue;
      }

      const book = bookIndex.get(bookId);

      if (!book) {
        setVerseTexts((prev) => ({ ...prev, [key]: "" }));
        continue;
      }

      pendingVerseFetches.current.add(key);
      void getPassage(
        translationCode,
        book.name,
        { chapter, verse: verseStart },
        {
          chapter,
          verse: note.verseEnd ?? verseStart,
        }
      )
        .then((response) => {
          const combined = response.verses.map((entry) => entry.text).join(" ");
          setVerseTexts((prev) => ({ ...prev, [key]: combined }));
        })
        .catch(() => {
          setVerseTexts((prev) => ({ ...prev, [key]: "" }));
        })
        .finally(() => {
          pendingVerseFetches.current.delete(key);
        });
    }
  }, [notes, translationCode, bookIndex]);

  const derivedNotes = useMemo<DerivedNote[]>(() => {
    return notes.map((note) => {
      const body = normaliseBody(note.body);
      const book = note.bookId ? bookIndex.get(note.bookId) : undefined;
      const referenceLabel = buildReferenceLabel(
        book,
        note.chapter,
        note.verseStart,
        note.verseEnd
      );

      const verseText = verseTexts[note.id] ?? null;
      const title = extractTitle(body);
      const dateLabel = formatDate(note.updatedAt ?? note.createdAt);

      return {
        raw: note,
        title,
        body,
        referenceLabel,
        verseText,
        dateLabel,
      };
    });
  }, [notes, bookIndex, verseTexts]);

  const filteredNotes = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();

    if (!needle) {
      return derivedNotes;
    }

    return derivedNotes.filter((note) => {
      if (note.title.toLowerCase().includes(needle)) {
        return true;
      }
      if (note.body.toLowerCase().includes(needle)) {
        return true;
      }
      if (note.referenceLabel && note.referenceLabel.toLowerCase().includes(needle)) {
        return true;
      }
      if (note.verseText && note.verseText.toLowerCase().includes(needle)) {
        return true;
      }
      return false;
    });
  }, [derivedNotes, searchQuery]);

  const handleCreateNote = async () => {
    if (!translationCode) {
      setCreateError("Select a translation before creating notes.");
      return;
    }

    if (!createBookId) {
      setCreateError("Choose a book for your note.");
      return;
    }

    const chapterValue = Number.parseInt(createChapter, 10);
    const verseStartValue = Number.parseInt(createVerseStart, 10);
    const verseEndValue = Number.parseInt(createVerseEnd, 10);
    const body = normaliseBody(createBody);

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

    if (body.length === 0) {
      setCreateError("Write your reflection before saving.");
      return;
    }

    setIsSavingCreate(true);
    setCreateError(null);

    try {
      const newNote = await createUserNote({
        translationId: translationCode,
        bookId: createBookId,
        chapter: chapterValue,
        verseStart: verseStartValue,
        verseEnd: verseEndValue,
        body,
      });

      setNotes((prev) => [newNote, ...prev]);
      setVerseTexts((prev) => {
        const next = { ...prev };
        delete next[newNote.id];
        return next;
      });
      setIsCreateOpen(false);
      toast.success("Note saved");
      dispatchNotesUpdated({ source: "notes-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create note";
      toast.error(message);
    } finally {
      setIsSavingCreate(false);
    }
  };

  const handleEdit = (note: UserNote) => {
    setEditingNote(note);
    setEditBody(note.body);
    setEditError(null);
  };

  const handleUpdateNote = async () => {
    if (!editingNote) {
      return;
    }

    const nextBody = normaliseBody(editBody);

    if (nextBody.length === 0) {
      setEditError("Note cannot be empty.");
      return;
    }

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const updated = await updateUserNote(editingNote.id, { body: nextBody });
      setNotes((prev) => prev.map((note) => (note.id === updated.id ? updated : note)));
      setEditingNote(null);
      toast.success("Note updated");
      dispatchNotesUpdated({ source: "notes-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update note";
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (note: UserNote) => {
    const confirmed = typeof window === "undefined" ? true : window.confirm("Delete this note?");

    if (!confirmed) {
      return;
    }

    const previousNotes = notes;

    setNotes((prev) => prev.filter((item) => item.id !== note.id));
    setVerseTexts((prev) => {
      const next = { ...prev };
      delete next[note.id];
      return next;
    });

    try {
      await deleteUserNote(note.id);
      toast.success("Note deleted");
      dispatchNotesUpdated({ source: "notes-screen" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete note";
      toast.error(message);
      setNotes(previousNotes);
    }
  };

  const selectedBook = createBookId ? bookIndex.get(createBookId) : null;
  const chapterOptions = selectedBook ? selectedBook.chapters : 1;

  const showLoadingState = isLoading || isLoadingTranslations || isLoadingBooks;

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-primary">Study Notes</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                disabled={books.length === 0}
              >
                <Plus className="w-4 h-4 mr-1" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[92vw] max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Note</DialogTitle>
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
                        {Array.from({ length: chapterOptions }, (_, index) => index + 1).map((chapterNumber) => (
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
                  <span className="text-xs font-medium text-muted-foreground">Reflection</span>
                  <Textarea
                    value={createBody}
                    onChange={(event) => setCreateBody(event.target.value)}
                    placeholder="Write your insights, prayers, and observations..."
                    className="min-h-[150px] bg-input-background border-border/50"
                  />
                </div>
                {createError && <p className="text-sm text-destructive">{createError}</p>}
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleCreateNote}
                  disabled={isSavingCreate}
                >
                  {isSavingCreate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search your notes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10 bg-input-background border-border/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        {showLoadingState ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">
            <p className="text-sm">No notes yet. Start by capturing a thought from today&apos;s reading.</p>
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <motion.div
              key={note.raw.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="border-border/50 bg-card/80 hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-base text-foreground">{note.title}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-3 text-xs">
                        {note.referenceLabel ? (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {note.referenceLabel}
                          </span>
                        ) : null}
                        {note.dateLabel ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {note.dateLabel}
                          </span>
                        ) : null}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleEdit(note.raw)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete(note.raw)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-foreground leading-relaxed">
                  {note.verseText ? (
                    <blockquote className="scripture-text italic text-muted-foreground border-l-2 border-accent pl-3">
                      “{note.verseText}”
                    </blockquote>
                  ) : null}
                  <p>{note.body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Dialog open={editingNote !== null} onOpenChange={(open) => (!open ? setEditingNote(null) : undefined)}>
        <DialogContent className="w-[92vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
              className="min-h-[180px] bg-input-background border-border/50"
            />
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditingNote(null)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleUpdateNote}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
