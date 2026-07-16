"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BookCombobox } from "@/components/bible/BookCombobox";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createStudyLinkMaterial,
  deleteStudyMaterial,
  listStudyMaterials,
  uploadStudyFileMaterial,
} from "@/lib/api/study";
import type {
  BibleBookSummary,
  BibleBooksResponse,
  BibleChapterResponse,
} from "@/types/bible";
import type { HostProfile, PreRead } from "@/types/pre-read";
import { formatWeekLabel, startOfWeek } from "@/lib/study/week";

import {
  createLocalId,
  type DraftMaterial,
} from "./draft-materials";
import styles from "./PreReadForm.module.css";
import { StudyHubPreview } from "./StudyHubPreview";
import { StudyMaterialsEditor } from "./StudyMaterialsEditor";

/** Bigger tap targets on mobile; comfortable padded size from md up. */
const btnSize =
  "h-12 px-5 text-base md:h-10 md:px-5 md:text-sm";
const btnIconSize = "size-11 md:size-9";
const btnSecondary =
  "h-12 min-w-[8.5rem] px-6 text-base md:h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-[#e0c4b6] bg-white text-[#1a1a1a] hover:border-[#d91f26] hover:bg-[#d91f26]/10 hover:text-[#d91f26]";
const btnPrimary =
  "h-12 min-w-[8.5rem] px-6 text-base md:h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-0 bg-gradient-to-br from-[#d91f26] to-[#f28c00] text-white font-bold shadow-[0_10px_24px_color-mix(in_oklab,#d91f26_28%,transparent)] hover:brightness-105 hover:text-white";
const btnStatus =
  "h-12 flex-1 basis-28 min-w-0 px-4 text-base md:h-10 md:px-5 md:text-sm hover:border-[#d91f26] hover:bg-[#d91f26]/10 hover:text-[#d91f26]";

type PreReadFormProps = {
  mode: "create" | "edit";
  initialData?: PreRead;
  hostOptions: HostProfile[];
};

type FormState = {
  title: string;
  weekStart: string;
  book: string;
  chapter: string;
  versesRange: string;
  summary: string;
  memoryVerse: string;
  reflectionQuestions: string[];
  pollQuestion: string;
  pollOptions: string[];
  hostProfileId: string;
  streamStartTime: string;
  isCancelled: boolean;
  published: boolean;
};

const CHAPTER_MIN = 1;
const DEFAULT_TRANSLATION_CODE = "WEB";
const CHAPTER_ENDPOINT = (book: string, chapter: number) =>
  `/api/bible/${encodeURIComponent(
    book
  )}/${chapter}?translation=${DEFAULT_TRANSLATION_CODE}`;
const BOOKS_ENDPOINT = `/api/bible/books?translation=${DEFAULT_TRANSLATION_CODE}`;

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
};

const toISOString = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentWeekStartInput = () => startOfWeek(new Date());

const ensureLength = (list: string[], min: number, fill = "") => {
  const clone = [...list];
  while (clone.length < min) {
    clone.push(fill);
  }
  return clone;
};

export default function PreReadForm({
  mode,
  initialData,
  hostOptions: _hostOptions,
}: PreReadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [books, setBooks] = useState<BibleBookSummary[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [versesManuallyEdited, setVersesManuallyEdited] = useState(
    Boolean(initialData?.verses_range && initialData.verses_range.length > 0)
  );
  const versesEditedRef = useRef(versesManuallyEdited);

  const [form, setForm] = useState<FormState>(() => ({
    title: initialData?.title ?? "",
    weekStart:
      (initialData?.week_start &&
        toDateInputValue(`${initialData.week_start}T12:00:00`)) ||
      getCurrentWeekStartInput(),
    book: initialData?.book ?? "",
    chapter: initialData?.chapter ? String(initialData.chapter) : "",
    versesRange: initialData?.verses_range ?? "",
    summary: initialData?.summary ?? "",
    memoryVerse: initialData?.memory_verse ?? "",
    reflectionQuestions:
      initialData?.reflection_questions &&
      initialData.reflection_questions.length > 0
        ? [...initialData.reflection_questions]
        : [""],
    pollQuestion: initialData?.poll_question ?? "",
    pollOptions:
      initialData?.poll_options && initialData.poll_options.length > 0
        ? ensureLength([...initialData.poll_options], 2, "")
        : ["", ""],
    hostProfileId: initialData?.host_profile_id ?? "",
    streamStartTime: toDateTimeLocal(initialData?.stream_start_time),
    isCancelled: initialData?.is_cancelled ?? false,
    published: initialData?.published ?? false,
  }));

  const [materials, setMaterials] = useState<DraftMaterial[]>([]);
  const [materialsReady, setMaterialsReady] = useState(mode === "create");

  const hasPoll = form.pollQuestion.trim().length > 0;

  useEffect(() => {
    if (mode !== "edit" || !initialData?.id) {
      setMaterialsReady(true);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const rows = await listStudyMaterials(initialData.id);
        if (cancelled) return;
        setMaterials(
          rows.map((row) => ({
            localId: createLocalId(),
            kind: row.kind,
            title: row.title,
            url: row.url,
            previewUrl: row.mime_type?.startsWith("image/")
              ? row.url
              : undefined,
            mimeType: row.mime_type,
            persistedId: row.id,
          })),
        );
      } catch (error) {
        console.error(error);
        toast.error("Unable to load study materials.");
      } finally {
        if (!cancelled) setMaterialsReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, initialData?.id]);
  const resetWeekStart = () => {
    setForm((prev) => ({
      ...prev,
      weekStart: getCurrentWeekStartInput(),
    }));
  };

  const handleFieldChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleVersesChange = (value: string) => {
    setVersesManuallyEdited(true);
    handleFieldChange("versesRange", value);
  };

  useEffect(() => {
    versesEditedRef.current = versesManuallyEdited;
  }, [versesManuallyEdited]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const loadBooks = async () => {
      try {
        setIsLoadingBooks(true);
        const response = await fetch(BOOKS_ENDPOINT, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Unable to load Bible books");
        }
        const payload = (await response.json()) as BibleBooksResponse;
        if (!mounted) {
          return;
        }
        const ordered = [...payload.books].sort((a, b) => a.order - b.order);
        setBooks(ordered);
      } catch (error) {
        if (mounted && (error as Error).name !== "AbortError") {
          console.error(error);
          toast.error("Failed to load Bible books.");
        }
      } finally {
        if (mounted) {
          setIsLoadingBooks(false);
        }
      }
    };

    loadBooks();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const selectedBook = useMemo(
    () => books.find((book) => book.name === form.book) ?? null,
    [books, form.book]
  );

  const chapterOptions = useMemo(() => {
    if (!selectedBook) return [];
    return Array.from(
      { length: Math.max(selectedBook.chapters, CHAPTER_MIN) },
      (_value, index) => index + 1
    );
  }, [selectedBook]);

  useEffect(() => {
    const currentBook = form.book;
    const currentChapter = Number.parseInt(form.chapter, 10);
    if (
      !currentBook ||
      !Number.isFinite(currentChapter) ||
      currentChapter < CHAPTER_MIN
    ) {
      return;
    }
    if (versesEditedRef.current) {
      return;
    }
    let active = true;
    const controller = new AbortController();

    const hydrateVerses = async () => {
      try {
        const response = await fetch(
          CHAPTER_ENDPOINT(currentBook, currentChapter),
          {
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          throw new Error("Unable to load chapter metadata");
        }
        const payload = (await response.json()) as BibleChapterResponse;
        const verseCount = Array.isArray(payload.verses)
          ? payload.verses.length
          : 0;
        if (!active || verseCount === 0) {
          return;
        }
        setForm((prev) => {
          if (
            versesEditedRef.current ||
            prev.book !== currentBook ||
            prev.chapter !== String(currentChapter)
          ) {
            return prev;
          }
          return {
            ...prev,
            versesRange: `1-${verseCount}`,
          };
        });
      } catch (error) {
        if (active && (error as Error).name !== "AbortError") {
          console.error("Failed to auto-fill verse range", error);
        }
      }
    };

    void hydrateVerses();

    return () => {
      active = false;
      controller.abort();
    };
  }, [form.book, form.chapter]);

  const handleBookSelect = (value: string) => {
    setForm((prev) => ({
      ...prev,
      book: value,
      chapter: "",
      versesRange: "",
    }));
    setVersesManuallyEdited(false);
  };

  const handleChapterSelect = (value: string) => {
    setForm((prev) => ({
      ...prev,
      chapter: value,
    }));
    setVersesManuallyEdited(false);
  };

  const updateReflectionQuestion = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.reflectionQuestions];
      next[index] = value;
      return { ...prev, reflectionQuestions: next };
    });
  };

  const addReflectionQuestion = () => {
    setForm((prev) => ({
      ...prev,
      reflectionQuestions: [...prev.reflectionQuestions, ""],
    }));
  };

  const removeReflectionQuestion = (index: number) => {
    setForm((prev) => {
      if (prev.reflectionQuestions.length <= 1) {
        return prev;
      }
      const next = prev.reflectionQuestions.filter((_, idx) => idx !== index);
      return { ...prev, reflectionQuestions: next };
    });
  };

  const updatePollOption = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.pollOptions];
      next[index] = value;
      return { ...prev, pollOptions: next };
    });
  };

  const addPollOption = () => {
    setForm((prev) => {
      if (prev.pollOptions.length >= 4) {
        return prev;
      }
      return { ...prev, pollOptions: [...prev.pollOptions, ""] };
    });
  };

  const removePollOption = (index: number) => {
    setForm((prev) => {
      if (prev.pollOptions.length <= 2) {
        return prev;
      }
      const next = prev.pollOptions.filter((_, idx) => idx !== index);
      return { ...prev, pollOptions: next };
    });
  };

  const currentStatus = form.isCancelled
    ? "cancelled"
    : form.published
      ? "published"
      : "draft";

  const setStatus = (status: "draft" | "published" | "cancelled") => {
    if (status === "draft") {
      setForm((prev) => ({ ...prev, published: false, isCancelled: false }));
    } else if (status === "published") {
      setForm((prev) => ({ ...prev, published: true, isCancelled: false }));
    } else {
      setForm((prev) => ({ ...prev, published: false, isCancelled: true }));
    }
  };

  const parseVerseRange = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const match = normalized.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) {
      return null;
    }
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start <= 0 ||
      end < start
    ) {
      return null;
    }
    return { start, end };
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const chapterNumber = Number.parseInt(form.chapter, 10);
    if (!Number.isFinite(chapterNumber) || chapterNumber <= 0) {
      toast.error("Chapter must be a positive number.");
      return;
    }

    if (!form.book.trim()) {
      toast.error("Book is required.");
      return;
    }

    if (!form.title.trim()) {
      toast.error("Topic title is required.");
      return;
    }

    if (!form.summary.trim()) {
      toast.error("Summary is required.");
      return;
    }

    if (!form.weekStart.trim()) {
      toast.error("Week start is required.");
      return;
    }

    const weekStart = startOfWeek(new Date(`${form.weekStart}T12:00:00`));

    const reflectionQuestions = form.reflectionQuestions
      .map((entry) => entry.trim())
      .filter(Boolean);

    const pollQuestion = form.pollQuestion.trim();
    const pollOptions = form.pollOptions
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (pollQuestion && pollOptions.length < 2) {
      toast.error("Polls need at least two options.");
      return;
    }

    const parsedRange = parseVerseRange(form.versesRange);
    if (form.versesRange.trim() && !parsedRange) {
      toast.error("Verses range must be a number (e.g., 1-26 or 5).");
      return;
    }

    const payload = {
      title: form.title.trim(),
      week_start: weekStart,
      book: form.book.trim(),
      chapter: chapterNumber,
      verses_range: form.versesRange.trim() || null,
      summary: form.summary.trim(),
      memory_verse: form.memoryVerse.trim() || null,
      reflection_questions: reflectionQuestions,
      poll_question: pollQuestion || null,
      poll_options: pollQuestion ? pollOptions : null,
      host_profile_id: form.hostProfileId || null,
      stream_start_time: toISOString(form.streamStartTime),
      is_cancelled: form.isCancelled,
      published: form.published,
    };

    setIsSubmitting(true);
    try {
      const endpoint =
        mode === "edit" && initialData
          ? `/api/pre-reads/${initialData.id}`
          : "/api/pre-reads";

      const response = await fetch(endpoint, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = "Unable to save weekly study.";
        try {
          const errorBody = (await response.json()) as { error?: string };
          if (errorBody?.error) {
            message = errorBody.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const saved = (await response.json()) as PreRead;
      const studyId = saved.id;

      // Persist draft materials after the study row exists.
      const toDelete = materials.filter(
        (material) => material.markedForDelete && material.persistedId,
      );
      const toCreate = materials.filter(
        (material) => !material.markedForDelete && !material.persistedId,
      );

      for (const material of toDelete) {
        if (material.persistedId) {
          await deleteStudyMaterial(studyId, material.persistedId);
        }
      }

      let sortOrder = 0;
      for (const material of toCreate) {
        if (material.kind === "link" && material.url) {
          await createStudyLinkMaterial(studyId, {
            title: material.title,
            url: material.url,
            sortOrder,
          });
          sortOrder += 1;
        } else if (material.kind === "file" && material.file) {
          await uploadStudyFileMaterial(
            studyId,
            material.file,
            material.title,
          );
          sortOrder += 1;
        }
      }

      toast.success(
        mode === "edit" ? "Weekly study updated." : "Weekly study created.",
      );

      router.push("/admin/pre-read");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unexpected error saving weekly study.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.formShell}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <p className={styles.toolbarEyebrow}>
            {mode === "edit" ? "Editing" : "New study"}
          </p>
          <p className={styles.toolbarTitle}>
            Attach materials, check the preview, then save
          </p>
        </div>
        <div className={styles.toolbarActions}>
          <Button
            variant="outline"
            asChild
            disabled={isSubmitting}
            className={btnSecondary}
          >
            <Link href="/admin/pre-read">Cancel</Link>
          </Button>
          <Button
            type="submit"
            form="pre-read-form"
            disabled={isSubmitting}
            className={btnPrimary}
          >
            {isSubmitting
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Create study"}
          </Button>
        </div>
      </div>

      <form id="pre-read-form" className={styles.form} onSubmit={handleSubmit}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>1 · Visibility</p>
            <h3 className={styles.sectionTitle}>Publish status</h3>
            <p className={styles.sectionMeta}>
              Draft stays private. Published shows on the member Study hub for
              that week.
            </p>
          </div>
          <div className={styles.statusToggles}>
            <Button
              type="button"
              variant={currentStatus === "draft" ? "default" : "outline"}
              className={btnStatus}
              onClick={() => setStatus("draft")}
            >
              Draft
            </Button>
            <Button
              type="button"
              variant={currentStatus === "published" ? "default" : "outline"}
              className={btnStatus}
              onClick={() => setStatus("published")}
            >
              Published
            </Button>
            <Button
              type="button"
              variant={currentStatus === "cancelled" ? "default" : "outline"}
              className={btnStatus}
              onClick={() => setStatus("cancelled")}
            >
              Hidden
            </Button>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>2 · Topic</p>
            <h3 className={styles.sectionTitle}>What is this week about?</h3>
          </div>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <Label htmlFor="study_title" className={styles.label}>
                Topic title
              </Label>
              <Input
                id="study_title"
                className={`${styles.control} w-full min-w-0 max-w-full`}
                value={form.title}
                onChange={(event) =>
                  handleFieldChange("title", event.target.value)
                }
                placeholder="Walking in Faith"
                required
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="week_start" className={styles.label}>
                Week of
              </Label>
              <Input
                id="week_start"
                type="date"
                className={`${styles.control} w-full min-w-0 max-w-full`}
                value={form.weekStart}
                onChange={(event) =>
                  handleFieldChange("weekStart", event.target.value)
                }
                required
              />
              <p className={styles.helper}>
                Saved as the Monday of that week
                {form.weekStart
                  ? ` (${formatWeekLabel(
                      startOfWeek(new Date(`${form.weekStart}T12:00:00`)),
                    )})`
                  : ""}
                .
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={`mt-1 w-fit ${btnSize}`}
                onClick={resetWeekStart}
              >
                Use this week
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>3 · Scripture</p>
            <h3 className={styles.sectionTitle}>Passage for the week</h3>
          </div>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <Label className={styles.label}>Book</Label>
              <BookCombobox
                books={books}
                value={form.book || undefined}
                valueKey="name"
                onValueChange={handleBookSelect}
                disabled={isLoadingBooks}
                placeholder={
                  isLoadingBooks ? "Loading books…" : "Choose a book"
                }
                searchPlaceholder="Type a book (e.g. gen, john)…"
                triggerClassName={`${styles.control} w-full min-w-0 max-w-full`}
                aria-label="Bible book"
              />
            </div>
            <div className={styles.field}>
              <Label className={styles.label}>Chapter</Label>
              <Combobox
                options={chapterOptions.map((chapter) => ({
                  value: String(chapter),
                  label: `Chapter ${chapter}`,
                  keywords: [String(chapter)],
                }))}
                value={form.chapter || undefined}
                onValueChange={handleChapterSelect}
                disabled={!selectedBook}
                placeholder={
                  selectedBook ? "Choose a chapter" : "Select a book first"
                }
                searchPlaceholder="Type a chapter number…"
                emptyMessage="No chapters match."
                triggerClassName={`${styles.control} w-full min-w-0 max-w-full`}
                aria-label="Chapter"
              />
            </div>
            <div className={styles.field}>
              <Label htmlFor="verses_range" className={styles.label}>
                Verses (optional)
              </Label>
              <Input
                id="verses_range"
                className={`${styles.control} w-full min-w-0 max-w-full`}
                value={form.versesRange}
                onChange={(event) => handleVersesChange(event.target.value)}
                placeholder="1-26"
              />
              <p className={styles.helper}>
                Leave blank for the full chapter.
              </p>
            </div>
            <div className={styles.field}>
              <Label htmlFor="memory_verse" className={styles.label}>
                Memory verse (optional)
              </Label>
              <Input
                id="memory_verse"
                className={`${styles.control} w-full min-w-0 max-w-full`}
                value={form.memoryVerse}
                onChange={(event) =>
                  handleFieldChange("memoryVerse", event.target.value)
                }
                placeholder="John 15:5"
              />
            </div>
          </div>
        </section>

        {materialsReady ? (
          <StudyMaterialsEditor
            materials={materials}
            onChange={setMaterials}
          />
        ) : (
          <section className={styles.materialsPanel}>
            <p className={styles.helper}>Loading materials…</p>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>5 · Summary</p>
            <h3 className={styles.sectionTitle}>Short overview for members</h3>
          </div>
          <div className={styles.field}>
            <Label htmlFor="summary" className={styles.label}>
              Summary
            </Label>
            <Textarea
              id="summary"
              rows={4}
              className={`${styles.control} w-full min-w-0 max-w-full`}
              value={form.summary}
              onChange={(event) =>
                handleFieldChange("summary", event.target.value)
              }
              placeholder="A few sentences on the heart of this week's study."
              required
            />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Optional · Engagement</p>
            <h3 className={styles.sectionTitle}>
              Reflection questions & poll
            </h3>
            <p className={styles.sectionMeta}>
              Skip these if you only need topic, scripture, and materials.
            </p>
          </div>

          <div className={styles.arrayGroup}>
            <Label className={styles.label}>Reflection questions</Label>
            {form.reflectionQuestions.map((question, index) => (
              <div className={styles.arrayRow} key={`reflection-${index}`}>
                <Input
                  className={`${styles.control} w-full min-w-0 max-w-full`}
                  value={question}
                  onChange={(event) =>
                    updateReflectionQuestion(index, event.target.value)
                  }
                  placeholder={`Question ${index + 1}`}
                />
                {form.reflectionQuestions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={btnIconSize}
                    onClick={() => removeReflectionQuestion(index)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={addReflectionQuestion}
              className={`w-fit ${btnSize}`}
            >
              <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Add question
            </Button>
          </div>

          <div className={styles.arrayGroup}>
            <Label className={styles.label}>Poll (optional)</Label>
            <Input
              value={form.pollQuestion}
              className={`${styles.control} w-full min-w-0 max-w-full`}
              onChange={(event) =>
                handleFieldChange("pollQuestion", event.target.value)
              }
              placeholder="What stands out most from this passage?"
            />
            {form.pollOptions.map((option, index) => (
              <div className={styles.arrayRow} key={`poll-${index}`}>
                <Input
                  className={`${styles.control} w-full min-w-0 max-w-full`}
                  value={option}
                  onChange={(event) =>
                    updatePollOption(index, event.target.value)
                  }
                  placeholder={`Option ${index + 1}`}
                  disabled={!hasPoll}
                />
                {form.pollOptions.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={btnIconSize}
                    onClick={() => removePollOption(index)}
                    disabled={!hasPoll}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={addPollOption}
              className={`w-fit ${btnSize}`}
              disabled={!hasPoll || form.pollOptions.length >= 4}
            >
              <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Add option
            </Button>
          </div>
        </section>

        <div className={styles.actions}>
          <Button
            variant="outline"
            asChild
            disabled={isSubmitting}
            className={btnSecondary}
          >
            <Link href="/admin/pre-read">Discard</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className={btnPrimary}
          >
            {isSubmitting
              ? "Saving…"
              : mode === "edit"
                ? "Save changes"
                : "Create study"}
          </Button>
        </div>
      </form>
      </div>

      <div className={styles.previewColumn}>
        <StudyHubPreview
          title={form.title}
          weekStart={form.weekStart}
          book={form.book}
          chapter={form.chapter}
          versesRange={form.versesRange}
          summary={form.summary}
          memoryVerse={form.memoryVerse}
          reflectionQuestions={form.reflectionQuestions}
          pollQuestion={form.pollQuestion}
          pollOptions={form.pollOptions}
          published={form.published}
          isCancelled={form.isCancelled}
          materials={materials}
        />
      </div>
    </div>
  );
}
