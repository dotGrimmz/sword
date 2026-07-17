"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import {
  Edit,
  Lightbulb,
  Loader2,
  Mic,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { AppHeaderToolbar } from "./AppHeaderToolbar";
import { useTranslationContext } from "./TranslationContext";
import { Button } from "./ui/button";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./ui/modal";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { LoadingScreen } from "@/components/LoadingScreen";
import { buildReferenceLabel } from "@/lib/api/bible";
import type { BibleBookSummary } from "@/types/bible";
import type { UserNote } from "@/types/user";
import { NOTES_UPDATED_EVENT } from "@/lib/events";
import { AudioNotePanel, type AudioNotePayload } from "./notes/AudioNotePanel";
import {
  useCreateNoteMutation,
  useDeleteNoteMutation,
  useNotesQuery,
  useUpdateNoteMutation,
} from "@/lib/query/notes";
import { usePassageTextsMap } from "@/lib/query/passages";
import controls from "@/components/realign/controls.module.css";
import styles from "./NotesScreen.module.css";

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

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff > 1 && dayDiff < 7) {
    return new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
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

const normaliseBody = (body: string | null | undefined) => (body ?? "").trim();

export function NotesScreen({ onNavigate }: NotesScreenProps = {}) {
  const {
    books,
    translation,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();

  const [searchQuery, setSearchQuery] = useState("");
  const fetchEnabled = Boolean(translationCode);

  const notesQuery = useNotesQuery(translationCode);
  const createMutation = useCreateNoteMutation(translationCode);
  const updateMutation = useUpdateNoteMutation(translationCode);
  const deleteMutation = useDeleteNoteMutation(translationCode);
  const notes = notesQuery.data ?? [];

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAudioNoteOpen, setIsAudioNoteOpen] = useState(false);
  const [createBookId, setCreateBookId] = useState<string | null>(null);
  const [createChapter, setCreateChapter] = useState("1");
  const [createVerseStart, setCreateVerseStart] = useState("1");
  const [createVerseEnd, setCreateVerseEnd] = useState("1");
  const [createBody, setCreateBody] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const isSavingCreate = createMutation.isPending;
  const isSavingEdit = updateMutation.isPending;

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


  const {
    refetch: refetchNotes,
    isError: notesError,
    error: notesErrorValue,
  } = notesQuery;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handler: EventListener = (event) => {
      const custom = event as CustomEvent<{ source?: string }>;

      if (custom.detail?.source === "notes-screen") {
        return;
      }

      void refetchNotes();
    };

    window.addEventListener(NOTES_UPDATED_EVENT, handler);
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handler);
    };
  }, [refetchNotes]);

  useEffect(() => {
    if (!notesError || !notesErrorValue) {
      return;
    }
    const message =
      notesErrorValue instanceof Error
        ? notesErrorValue.message
        : "Failed to load notes";
    toast.error(message);
  }, [notesError, notesErrorValue]);

  const passageRequests = useMemo(
    () =>
      notes.map((note) => {
        const book = note.bookId ? bookIndex.get(note.bookId) : undefined;
        return {
          id: note.id,
          bookName: book?.name,
          chapter: note.chapter,
          verseStart: note.verseStart,
          verseEnd: note.verseEnd,
        };
      }),
    [bookIndex, notes],
  );

  const verseTexts = usePassageTextsMap(translationCode, passageRequests);

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
      if ((note.body ?? "").toLowerCase().includes(needle)) {
        return true;
      }
      if (
        note.referenceLabel &&
        note.referenceLabel.toLowerCase().includes(needle)
      ) {
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

    setCreateError(null);

    try {
      const activeTranslationId = translation?.id ?? translationCode;

      await createMutation.mutateAsync({
        translationId: activeTranslationId,
        bookId: createBookId,
        chapter: chapterValue,
        verseStart: verseStartValue,
        verseEnd: verseEndValue,
        body,
      });

      setIsCreateOpen(false);
      toast.success("Note saved");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create note";
      toast.error(message);
    }
  };

  const handleVoiceNoteSubmit = useCallback(
    async (payload: AudioNotePayload) => {
      if (!translationCode) {
        throw new Error("Select a translation before creating notes.");
      }

      const activeTranslationId = translation?.id ?? translationCode;

      await createMutation.mutateAsync({
        translationId: activeTranslationId,
        bookId: payload.bookId,
        chapter: payload.chapter,
        verseStart: payload.verseStart,
        verseEnd: payload.verseEnd,
        body: payload.body,
      });
    },
    [createMutation, translation?.id, translationCode]
  );

  const handleEdit = (note: UserNote) => {
    setEditingNote(note);
    setEditBody(note.body ?? "");
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

    setEditError(null);

    try {
      await updateMutation.mutateAsync({
        id: editingNote.id,
        payload: { body: nextBody },
      });
      setEditingNote(null);
      toast.success("Note updated");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update note";
      toast.error(message);
    }
  };

  const handleDelete = async (note: UserNote) => {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm("Delete this note?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(note);
      toast.success("Note deleted");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete note";
      toast.error(message);
    }
  };

  const selectedBook = createBookId ? bookIndex.get(createBookId) : null;
  const chapterOptions = selectedBook ? selectedBook.chapters : 1;

  const showLoadingState =
    isLoadingTranslations ||
    isLoadingBooks ||
    !fetchEnabled ||
    notesQuery.isLoading;

  const noteCountLabel =
    derivedNotes.length === 0
      ? "Capture what God is showing you"
      : `${derivedNotes.length} reflection${derivedNotes.length === 1 ? "" : "s"}`;

  const canCompose = books.length > 0 && Boolean(translationCode);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerBar}>
          <div className={styles.headerTitleWrap}>
            <p className={styles.headerEyebrow}>Journal</p>
            <h1 className={styles.headerTitle}>Reflections</h1>
            <p className={styles.headerSubtitle}>{noteCountLabel}</p>
          </div>
          <AppHeaderToolbar
            onNavigateProfile={() => onNavigate?.("settings")}
          />
        </div>

        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="icon"
            className={`${controls.btnIcon} ${styles.recordButton}`}
            disabled={!canCompose}
            onClick={() => setIsAudioNoteOpen(true)}
            aria-label="Record a voice note"
            title="Record note"
          >
            <Mic className={styles.addButtonIcon} aria-hidden="true" />
          </Button>
          <Button
            className={`${controls.btnPrimary} ${styles.newButton}`}
            disabled={!canCompose}
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className={styles.addButtonIcon} aria-hidden="true" />
            New reflection
          </Button>
        </div>

        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <Input
            placeholder="Search reflections…"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`${controls.control} ${styles.searchInput}`}
          />
        </div>
      </header>

      <Modal open={isAudioNoteOpen} onOpenChange={setIsAudioNoteOpen}>
        <ModalContent size="lg">
          <ModalHeader className="sr-only">
            <ModalTitle>Record a voice note</ModalTitle>
          </ModalHeader>
          <ModalBody>
            <AudioNotePanel
              isOpen={isAudioNoteOpen}
              books={books}
              onClose={() => setIsAudioNoteOpen(false)}
              onSubmit={handleVoiceNoteSubmit}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <ModalContent size="lg">
          <ModalHeader className={styles.dialogHeader}>
            <ModalTitle>New reflection</ModalTitle>
            <ModalDescription className={styles.dialogDescription}>
              Anchor a thought, prayer, or takeaway to Scripture.
            </ModalDescription>
          </ModalHeader>

          <ModalBody>
            <div className={styles.formStack}>
              <div className={`${styles.fieldGrid} ${styles.fieldGridTwoColumns}`}>
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
                    <SelectTrigger className={controls.control}>
                      <SelectValue placeholder="Select book" />
                    </SelectTrigger>
                    <SelectContent className={`${styles.selectContent} z-[9999]`}>
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
                    <SelectTrigger className={controls.control}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${styles.selectContent} z-[9999]`}>
                      {Array.from(
                        { length: chapterOptions },
                        (_, index) => index + 1,
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
                </div>
              </div>
              <div className={`${styles.fieldGrid} ${styles.fieldGridTwoColumns}`}>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Verse start</span>
                  <Input
                    type="number"
                    min={1}
                    value={createVerseStart}
                    onChange={(event) =>
                      setCreateVerseStart(event.target.value)
                    }
                    className={controls.control}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Verse end</span>
                  <Input
                    type="number"
                    min={createVerseStart}
                    value={createVerseEnd}
                    onChange={(event) => setCreateVerseEnd(event.target.value)}
                    className={controls.control}
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Reflection</span>
                <Textarea
                  value={createBody}
                  onChange={(event) => setCreateBody(event.target.value)}
                  placeholder="What stood out? How will you respond?"
                  className={`${controls.control} ${controls.controlTextarea} ${styles.textarea}`}
                />
              </div>
              {createError ? (
                <p className={styles.errorMessage}>{createError}</p>
              ) : null}
              <Button
                className={`${controls.btnPrimary} ${styles.saveButton}`}
                onClick={handleCreateNote}
                disabled={isSavingCreate}
              >
                {isSavingCreate ? (
                  <Loader2 className={styles.spinner} aria-hidden="true" />
                ) : null}
                Save reflection
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <div className={styles.listArea}>
        {showLoadingState ? (
          <LoadingScreen
            variant="section"
            title="Loading reflections…"
            subtitle="Gathering your notes and Scripture references."
          />
        ) : filteredNotes.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIconWrap} aria-hidden="true">
              <Lightbulb className={styles.emptyIcon} />
            </span>
            <h2 className={styles.emptyTitle}>
              {searchQuery.trim()
                ? "No matches"
                : "Nothing captured yet"}
            </h2>
            <p className={styles.emptyCopy}>
              {searchQuery.trim()
                ? "Try a different word, book, or verse."
                : "Jot a takeaway, prayer, or question after you read."}
            </p>
            {!searchQuery.trim() ? (
              <div className={styles.emptyActions}>
                <Button
                  className={controls.btnPrimary}
                  disabled={!canCompose}
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className={styles.addButtonIcon} aria-hidden="true" />
                  Write a reflection
                </Button>
                <Button
                  variant="outline"
                  className={controls.btnSecondary}
                  disabled={!canCompose}
                  onClick={() => setIsAudioNoteOpen(true)}
                >
                  <Mic className={styles.addButtonIcon} aria-hidden="true" />
                  Record
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className={styles.noteList}>
            {filteredNotes.map((note, index) => (
              <motion.li
                key={note.raw.id}
                className={styles.noteItem}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.04 }}
              >
                <div className={styles.noteItemTop}>
                  <div className={styles.noteMetaCol}>
                    <p
                      className={
                        note.referenceLabel
                          ? styles.noteReference
                          : `${styles.noteReference} ${styles.noteReferenceMuted}`
                      }
                    >
                      {note.referenceLabel ?? "Open reflection"}
                    </p>
                    {note.dateLabel ? (
                      <p className={styles.noteDate}>{note.dateLabel}</p>
                    ) : null}
                  </div>
                  <div className={styles.noteActions}>
                    <Button
                      variant="outline"
                      size="icon"
                      className={controls.btnIcon}
                      onClick={() => handleEdit(note.raw)}
                      aria-label="Edit reflection"
                    >
                      <Edit className={styles.noteActionIcon} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={controls.btnIconDanger}
                      onClick={() => handleDelete(note.raw)}
                      aria-label="Delete reflection"
                    >
                      <Trash2 className={styles.noteActionIcon} />
                    </Button>
                  </div>
                </div>
                {note.body ? (
                  <p className={styles.noteBody}>{note.body}</p>
                ) : null}
                {note.verseText ? (
                  <blockquote className={`${styles.noteVerse} scripture-text`}>
                    “{note.verseText}”
                  </blockquote>
                ) : null}
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={editingNote !== null}
        onOpenChange={(open) => (!open ? setEditingNote(null) : undefined)}
      >
        <ModalContent size="md">
          <ModalHeader className={styles.dialogHeader}>
            <ModalTitle>Edit reflection</ModalTitle>
            <ModalDescription className={styles.dialogDescription}>
              Update what you wrote. Your passage link stays the same.
            </ModalDescription>
          </ModalHeader>
          <ModalBody tight>
            <Textarea
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
              className={`${controls.control} ${controls.controlTextarea} ${styles.textarea} ${styles.editTextarea}`}
            />
            {editError ? (
              <p className={styles.errorMessage}>{editError}</p>
            ) : null}
          </ModalBody>
          <ModalFooter className={styles.editActions} direction="row">
            <Button
              variant="outline"
              className={controls.btnSecondary}
              onClick={() => setEditingNote(null)}
            >
              Cancel
            </Button>
            <Button
              className={controls.btnPrimary}
              onClick={handleUpdateNote}
              disabled={isSavingEdit}
            >
              {isSavingEdit ? (
                <Loader2 className={styles.spinner} aria-hidden="true" />
              ) : null}
              Save changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
