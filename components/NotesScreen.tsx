"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Sparkles,
} from "lucide-react";

import { useTranslationContext } from "./TranslationContext";
import { TranslationSwitcher } from "./TranslationSwitcher";
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
import {
  createUserNote,
  deleteUserNote,
  getUserNotes,
  updateUserNote,
} from "@/lib/api/notes";
import type { BibleBookSummary } from "@/types/bible";
import type { UserNote } from "@/types/user";
import { NOTES_UPDATED_EVENT, dispatchNotesUpdated } from "@/lib/events";
import { AudioNotePanel, type AudioNotePayload } from "./notes/AudioNotePanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
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

const normaliseBody = (body: string | null | undefined) => (body ?? "").trim();

export function NotesScreen({ onNavigate }: NotesScreenProps = {}) {
  void onNavigate;

  const {
    books,
    translation,
    translationCode,
    isLoadingBooks,
    isLoadingTranslations,
  } = useTranslationContext();

  const [searchQuery, setSearchQuery] = useState("");
  const translationKey = translationCode ?? "none";
  const fetchEnabled = Boolean(translationCode);

  const queryClient = useQueryClient();
  const notesQueryKey = queryKeys.userNotes(translationKey);

  const notesQuery = useQuery({
    queryKey: notesQueryKey,
    queryFn: () => getUserNotes(undefined, translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: fetchEnabled,
  });
  const notes = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);

  const setNotesCache = useCallback(
    (
      value:
        | UserNote[]
        | ((previous: UserNote[] | undefined) => UserNote[]),
    ) => {
      queryClient.setQueryData<UserNote[]>(notesQueryKey, value);
    },
    [notesQueryKey, queryClient],
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAudioNoteOpen, setIsAudioNoteOpen] = useState(false);
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

    setIsSavingCreate(true);
    setCreateError(null);

    try {
      const activeTranslationId = translation?.id ?? translationCode;

      const newNote = await createUserNote({
        translationId: activeTranslationId,
        bookId: createBookId,
        chapter: chapterValue,
        verseStart: verseStartValue,
        verseEnd: verseEndValue,
        body,
      });

      setNotesCache((prev) => [newNote, ...(prev ?? [])]);
      setIsCreateOpen(false);
      toast.success("Note saved");
      dispatchNotesUpdated({ source: "notes-screen" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create note";
      toast.error(message);
    } finally {
      setIsSavingCreate(false);
    }
  };

  const handleVoiceNoteSubmit = useCallback(
    async (payload: AudioNotePayload) => {
      if (!translationCode) {
        throw new Error("Select a translation before creating notes.");
      }

      const activeTranslationId = translation?.id ?? translationCode;

      const newNote = await createUserNote({
        translationId: activeTranslationId,
        bookId: payload.bookId,
        chapter: payload.chapter,
        verseStart: payload.verseStart,
        verseEnd: payload.verseEnd,
        body: payload.body,
      });

      setNotesCache((prev) => [newNote, ...(prev ?? [])]);
      dispatchNotesUpdated({ source: "notes-screen" });
    },
    [setNotesCache, translation?.id, translationCode]
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

    setIsSavingEdit(true);
    setEditError(null);

    try {
      const updated = await updateUserNote(editingNote.id, { body: nextBody });
      setNotesCache((prev) =>
        (prev ?? []).map((note) => (note.id === updated.id ? updated : note))
      );
      setEditingNote(null);
      toast.success("Note updated");
      dispatchNotesUpdated({ source: "notes-screen" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not update note";
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
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

    const previousNotes = notes;

    setNotesCache((prev) => (prev ?? []).filter((item) => item.id !== note.id));

    try {
      await deleteUserNote(note.id);
      toast.success("Note deleted");
      dispatchNotesUpdated({ source: "notes-screen" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not delete note";
      toast.error(message);
      setNotesCache(previousNotes);
    }
  };

  const selectedBook = createBookId ? bookIndex.get(createBookId) : null;
  const chapterOptions = selectedBook ? selectedBook.chapters : 1;

  const showLoadingState =
    isLoadingTranslations ||
    isLoadingBooks ||
    !fetchEnabled ||
    notesQuery.isLoading;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <div className={styles.headerBar}>
          <div className={styles.headerTitleWrap}>
            <h1 className={styles.headerTitle}>Reflections</h1>
          </div>
          <div className={styles.headerActions}>
            <TranslationSwitcher
              className={styles.translationControl}
              size="compact"
              hideLabel
            />
            <Button
              variant="outline"
              className={controls.btnSecondary}
              disabled={books.length === 0 || !translationCode}
              onClick={() => setIsAudioNoteOpen(true)}
            >
              Record Note
            </Button>
            <Button
              className={controls.btnPrimary}
              disabled={books.length === 0 || !translationCode}
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className={styles.addButtonIcon} />
              New Note
            </Button>
          </div>
        </div>

        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <Input
            placeholder="Search your reflections..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`${controls.control} ${styles.searchInput}`}
          />
        </div>
      </div>

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
            <ModalTitle>Create Note</ModalTitle>
            <ModalDescription className={styles.dialogDescription}>
              Capture reflections, prayers, and applications as you study
              Scripture.
            </ModalDescription>
          </ModalHeader>

          <ModalBody>
            <motion.div
              className={styles.dialogHero}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <span className={styles.dialogHeroIcon}>
                <Sparkles aria-hidden="true" />
              </span>
              <div>
                <p className={styles.dialogHeroTitle}>
                  Build a richer study archive
                </p>
                <p className={styles.dialogHeroSubtitle}>
                  Anchor each insight to the passage you&apos;re exploring and
                  watch themes emerge.
                </p>
              </div>
            </motion.div>

            <div className={styles.formStack}>
              <motion.div
                className={`${styles.fieldGrid} ${styles.fieldGridTwoColumns}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
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
                    <SelectTrigger className={`${controls.control} ${styles.selectTrigger}`}>
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
                  <p className={styles.dialogHint}>
                    {books.length > 0
                      ? `${books.length} books available in ${
                          translation?.name ?? translationCode?.toUpperCase() ?? "your library"
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
                    <SelectTrigger className={`${controls.control} ${styles.selectTrigger}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={`${styles.selectContent} z-[9999]`}>
                      {Array.from({ length: chapterOptions }, (_, index) => index + 1).map(
                        (chapterNumber) => (
                          <SelectItem
                            key={chapterNumber}
                            value={`${chapterNumber}`}
                            className={styles.selectItem}
                          >
                            {chapterNumber}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <p className={styles.dialogHint}>
                    {selectedBook
                      ? `${selectedBook.chapters} chapters in ${selectedBook.name}`
                      : "Pick a book to see chapter options."}
                  </p>
                </div>
              </motion.div>
              <motion.div
                className={`${styles.fieldGrid} ${styles.fieldGridTwoColumns}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: "easeOut", delay: 0.12 }}
              >
                <div className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Verse start</span>
                  <Input
                    type="number"
                    min={1}
                    value={createVerseStart}
                    onChange={(event) => setCreateVerseStart(event.target.value)}
                    className={`${controls.control} ${styles.input}`}
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
                    onChange={(event) => setCreateVerseEnd(event.target.value)}
                    className={`${controls.control} ${styles.input}`}
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
                transition={{ duration: 0.28, ease: "easeOut", delay: 0.16 }}
              >
                <span className={styles.fieldLabel}>Reflection</span>
                <Textarea
                  value={createBody}
                  onChange={(event) => setCreateBody(event.target.value)}
                  placeholder="Write your insights, prayers, and observations..."
                  className={`${controls.control} ${controls.controlTextarea} ${styles.textarea}`}
                />
                <p className={styles.dialogHint}>
                  Focus on what stood out, why it matters, and how you&apos;ll respond.
                </p>
              </motion.div>
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
                  className={`${controls.btnPrimary} ${styles.saveButton}`}
                  onClick={handleCreateNote}
                  disabled={isSavingCreate}
                >
                  {isSavingCreate ? <Loader2 className={styles.spinner} /> : null}
                  Save Note
                </Button>
                <p className={styles.dialogTip}>
                  Tip: tag key verses so your notes surface alongside memory reviews.
                </p>
              </motion.div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      <div className={styles.listArea}>
        {showLoadingState ? (
          <LoadingScreen
            variant="section"
            title="Loading your notes…"
            subtitle="We’re gathering your reflections and Scripture references."
          />
        ) : filteredNotes.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyBadge}>
              <Image
                src="/sword_logo.png"
                alt="Sword logo"
                width={90}
                height={90}
                className={styles.emptyBadgeImage}
              />
            </div>
            <h3 className={styles.emptyTitle}>Your study journal is ready</h3>
            <p className={styles.emptyCopy}>
              Capture a reflection or prayer to begin building your archive
              that surfaces alongside your studies.
            </p>
          </div>
        ) : (
          filteredNotes.map((note, index) => (
            <motion.div
              key={note.raw.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: index * 0.04 }}
            >
              <Card className={styles.noteCard}>
                <CardHeader className={styles.noteHeader}>
                  <div className={styles.noteHeaderRow}>
                    <div className={styles.noteTitleWrap}>
                      <CardTitle className={styles.noteTitle}>
                        {note.title}
                      </CardTitle>
                      <CardDescription className={styles.noteMeta}>
                        {note.referenceLabel ? (
                          <span className={styles.noteMetaItem}>
                            <BookOpen
                              className={styles.noteMetaIcon}
                              aria-hidden="true"
                            />
                            {note.referenceLabel}
                          </span>
                        ) : null}
                        {note.dateLabel ? (
                          <span className={styles.noteMetaItem}>
                            <Calendar
                              className={styles.noteMetaIcon}
                              aria-hidden="true"
                            />
                            {note.dateLabel}
                          </span>
                        ) : null}
                      </CardDescription>
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
                </CardHeader>
                <CardContent className={styles.noteContent}>
                  {note.verseText ? (
                    <blockquote
                      className={`${styles.noteVerse} scripture-text`}
                    >
                      “{note.verseText}”
                    </blockquote>
                  ) : null}
                  {note.body ? (
                    <p className={styles.noteBody}>{note.body}</p>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <Modal
        open={editingNote !== null}
        onOpenChange={(open) => (!open ? setEditingNote(null) : undefined)}
      >
        <ModalContent size="md">
          <ModalHeader className={styles.dialogHeader}>
            <ModalTitle>Edit Note</ModalTitle>
            <ModalDescription className={styles.dialogDescription}>
              Refine your reflection and keep it aligned with what you&apos;re
              learning.
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
              {isSavingEdit ? <Loader2 className={styles.spinner} /> : null}
              Save changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
