"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import managerStyles from "../AdminManager.module.css";
import type {
  BibleBookSummary,
  BibleBooksResponse,
  BibleChapterResponse,
} from "@/types/bible";
import type { HostProfile, PreRead } from "@/types/pre-read";

import styles from "./PreReadForm.module.css";

type PreReadFormProps = {
  mode: "create" | "edit";
  initialData?: PreRead;
  hostOptions: HostProfile[];
};

type FormState = {
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
  visibleFrom: string;
  visibleUntil: string;
  isCancelled: boolean;
  published: boolean;
};

const HOST_NONE_VALUE = "__host_none";
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
  hostOptions,
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
    visibleFrom: toDateTimeLocal(initialData?.visible_from),
    visibleUntil: toDateTimeLocal(initialData?.visible_until),
    isCancelled: initialData?.is_cancelled ?? false,
    published: initialData?.published ?? false,
  }));

  const hasPoll = form.pollQuestion.trim().length > 0;
  const hostSelectValue = form.hostProfileId
    ? form.hostProfileId
    : HOST_NONE_VALUE;

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

  const hostOptionsList = useMemo(
    () =>
      hostOptions
        .map((host) => ({
          id: host.id,
          label: host.username ?? "Unnamed Host",
          inactive: !host.is_host_active,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [hostOptions]
  );
  console.log("hostOptions", hostOptions);

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

    if (!form.summary.trim()) {
      toast.error("Summary is required.");
      return;
    }

    const visibleFromISO = toISOString(form.visibleFrom);
    const visibleUntilISO = toISOString(form.visibleUntil);

    if (!visibleFromISO || !visibleUntilISO) {
      toast.error("Visible from/until are required.");
      return;
    }

    if (
      new Date(visibleFromISO).getTime() >= new Date(visibleUntilISO).getTime()
    ) {
      toast.error("Visible until must be after visible from.");
      return;
    }

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
      visible_from: visibleFromISO,
      visible_until: visibleUntilISO,
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
        let message = "Unable to save Pre-Read.";
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

      toast.success(
        mode === "edit"
          ? "Pre-Read updated successfully."
          : "Pre-Read created successfully."
      );
      router.push("/admin/pre-read");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unexpected error saving Pre-Read."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={managerStyles.managerContainer}>
      <div className={managerStyles.managerHeader}>
        <div className={managerStyles.managerHeading}>
          <p className={managerStyles.managerMeta}>
            {mode === "edit"
              ? "Edit existing Pre-Read"
              : "Create a new Pre-Read"}
          </p>
          <h2 className={managerStyles.managerTitle}>
            {mode === "edit" ? "Update Daily Study" : "New Daily Study"}
          </h2>
        </div>
        <div className={managerStyles.buttonGroup}>
          <Button
            variant="outline"
            asChild
            disabled={isSubmitting}
            className={styles.neutralButton}
          >
            <Link href="/admin/pre-read">Cancel</Link>
          </Button>
          <Button type="submit" form="pre-read-form" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : mode === "edit"
              ? "Save Changes"
              : "Create Pre-Read"}
          </Button>
        </div>
      </div>

      <form id="pre-read-form" className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <Label className={styles.label}>Book</Label>
            <Select
              value={form.book || undefined}
              onValueChange={handleBookSelect}
              disabled={isLoadingBooks}
            >
              <SelectTrigger className={styles.control}>
                <SelectValue
                  placeholder={
                    isLoadingBooks ? "Loading books..." : "Choose a book"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.name}>
                    {book.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={styles.field}>
            <Label className={styles.label}>Chapter</Label>
            <Select
              value={form.chapter || undefined}
              onValueChange={handleChapterSelect}
              disabled={!selectedBook}
            >
              <SelectTrigger className={styles.control}>
                <SelectValue
                  placeholder={
                    selectedBook ? "Choose a chapter" : "Select a book first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {chapterOptions.map((chapter) => (
                  <SelectItem key={chapter} value={String(chapter)}>
                    Chapter {chapter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={styles.field}>
            <Label htmlFor="verses_range" className={styles.label}>
              Verses Range
            </Label>
            <Input
              id="verses_range"
              className={styles.control}
              value={form.versesRange}
              onChange={(event) => handleVersesChange(event.target.value)}
              placeholder="1-26"
            />
            <p className={styles.helper}>
              Defaults to the full chapter. Update this if you want a subset.
            </p>
          </div>
          <div className={styles.field}>
            <Label htmlFor="memory_verse" className={styles.label}>
              Memory Verse (optional)
            </Label>
            <Input
              id="memory_verse"
              className={styles.control}
              value={form.memoryVerse}
              onChange={(event) =>
                handleFieldChange("memoryVerse", event.target.value)
              }
              placeholder="John 4:24"
            />
          </div>
        </div>

        <div className={styles.field}>
          <Label htmlFor="summary" className={styles.label}>
            Summary
          </Label>
          <Textarea
            id="summary"
            rows={5}
            className={styles.control}
            value={form.summary}
            onChange={(event) =>
              handleFieldChange("summary", event.target.value)
            }
            placeholder="Describe the key points for this study."
          />
        </div>

        <div className={styles.arrayGroup}>
          <div className={styles.field}>
            <Label className={styles.label}>Reflection Questions</Label>
            <p className={styles.helper}>
              Provide prompts participants will consider before the session.
            </p>
          </div>
          {form.reflectionQuestions.map((question, index) => (
            <div className={styles.arrayRow} key={`reflection-${index}`}>
              <Input
                className={styles.control}
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
            className="w-fit"
          >
            <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Question
          </Button>
        </div>

        <div className={styles.arrayGroup}>
          <div className={styles.field}>
            <Label className={styles.label}>Poll (optional)</Label>
            <p className={styles.helper}>
              Include a quick poll with 2-4 options for engagement.
            </p>
          </div>
          <Input
            value={form.pollQuestion}
            className={styles.control}
            onChange={(event) =>
              handleFieldChange("pollQuestion", event.target.value)
            }
            placeholder="What stands out most from this passage?"
          />
          {form.pollOptions.map((option, index) => (
            <div className={styles.arrayRow} key={`poll-${index}`}>
              <Input
                className={styles.control}
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
            className="w-fit"
            disabled={!hasPoll || form.pollOptions.length >= 4}
          >
            <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Add Option
          </Button>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <Label className={styles.label}>Host</Label>
            <Select
              value={hostSelectValue}
              onValueChange={(value) =>
                handleFieldChange(
                  "hostProfileId",
                  value === HOST_NONE_VALUE ? "" : value
                )
              }
            >
              <SelectTrigger className={styles.control}>
                <SelectValue placeholder="Select a host" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HOST_NONE_VALUE}>
                  No assigned host
                </SelectItem>
                {hostOptionsList.map((host) => (
                  <SelectItem key={host.id} value={host.id}>
                    {host.label}
                    {host.inactive ? " (inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.field}>
            <Label htmlFor="stream_start_time" className={styles.label}>
              Stream Start (optional)
            </Label>
            <Input
              id="stream_start_time"
              type="datetime-local"
              className={styles.control}
              value={form.streamStartTime}
              onChange={(event) =>
                handleFieldChange("streamStartTime", event.target.value)
              }
            />
          </div>
        </div>

        <div className={styles.twoColumn}>
          <div className={styles.field}>
            <Label htmlFor="visible_from" className={styles.label}>
              Visible From
            </Label>
            <Input
              id="visible_from"
              type="datetime-local"
              className={styles.control}
              value={form.visibleFrom}
              onChange={(event) =>
                handleFieldChange("visibleFrom", event.target.value)
              }
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="visible_until" className={styles.label}>
              Visible Until
            </Label>
            <Input
              id="visible_until"
              type="datetime-local"
              className={styles.control}
              value={form.visibleUntil}
              onChange={(event) =>
                handleFieldChange("visibleUntil", event.target.value)
              }
            />
          </div>
        </div>

        <div className={styles.switchRow}>
          <div className={styles.switchLabel}>
            Published
            <span className={styles.switchDescription}>
              Controls whether members can see this Pre-Read.
            </span>
          </div>
          <Switch
            checked={form.published}
            onCheckedChange={(value) =>
              setForm((prev) => ({ ...prev, published: value }))
            }
          />
        </div>

        <div className={styles.switchRow}>
          <div className={styles.switchLabel}>
            Cancelled
            <span className={styles.switchDescription}>
              Mark as cancelled instead of deleting to preserve history.
            </span>
          </div>
          <Switch
            checked={form.isCancelled}
            onCheckedChange={(value) =>
              setForm((prev) => ({ ...prev, isCancelled: value }))
            }
          />
        </div>

        <div className={styles.actions}>
          <Button
            variant="outline"
            asChild
            disabled={isSubmitting}
            className={styles.neutralButton}
          >
            <Link href="/admin/pre-read">Discard changes</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : mode === "edit"
              ? "Save Changes"
              : "Create Pre-Read"}
          </Button>
        </div>
      </form>
    </div>
  );
}
