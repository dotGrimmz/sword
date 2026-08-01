"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  createAdminQuiz,
  deleteAdminQuiz,
  generateAdminQuiz,
  updateAdminQuiz,
} from "@/lib/api/admin-quizzes";
import { getBooksForTranslation } from "@/lib/api/bible";
import { ApiError } from "@/lib/api/fetch";
import { quizDraftToInput } from "@/lib/quizzes/draft-to-input";
import type { BibleBookSummary, BibleTranslationSummary } from "@/types/bible";
import type {
  Quiz,
  QuizGenerateRequest,
  QuizInput,
  QuizQuestion,
  QuizStatus,
} from "@/types/quizzes";

const STATUS_OPTIONS: {
  value: QuizStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "draft",
    label: "Draft",
    description: "Not visible to members. Keep editing until ready.",
  },
  {
    value: "published",
    label: "Published",
    description: "Ready to assign. Visible when members receive it.",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Retired from active use. Kept for history.",
  },
];

import styles from "./QuizForm.module.css";
import QuizGeneratePanel, {
  type QuizGeneratePanelValues,
} from "./QuizGeneratePanel";
import QuizQuestionsEditor from "./QuizQuestionsEditor";

const btnSecondary =
  "h-16 min-h-16 min-w-[10rem] px-8 text-base border-[#e0c4b6] bg-white text-[#1a1a1a] hover:border-[#d91f26] hover:bg-[#d91f26]/10 hover:text-[#d91f26] cursor-pointer";
const btnPrimary =
  "h-16 min-h-16 min-w-[10rem] px-8 text-base border-0 bg-gradient-to-br from-[#d91f26] to-[#f28c00] text-white font-bold shadow-[0_10px_24px_color-mix(in_oklab,#d91f26_28%,transparent)] hover:brightness-105 hover:text-white cursor-pointer";
const btnDanger =
  "h-16 min-h-16 min-w-[10rem] px-8 text-base border-[#e0c4b6] bg-white text-[#d91f26] hover:border-[#d91f26] hover:bg-[#d91f26]/10 cursor-pointer";

type QuizFormProps = {
  mode: "create" | "edit";
  initialQuiz?: Quiz | null;
  translations: BibleTranslationSummary[];
};

const defaultTranslation = (translations: BibleTranslationSummary[]) =>
  translations.find((item) => item.code === "WEB")?.code ??
  translations[0]?.code ??
  "";

const buildInitialPanel = (
  quiz: Quiz | null | undefined,
  translations: BibleTranslationSummary[],
): QuizGeneratePanelValues => {
  if (quiz) {
    return {
      translation: quiz.translation_code,
      book: quiz.book,
      startChapter: quiz.start_chapter,
      startVerse: quiz.start_verse,
      endChapter: quiz.end_chapter,
      endVerse: quiz.end_verse,
      questionCount: Math.min(20, Math.max(3, quiz.question_count || 5)),
      difficulty: quiz.generation_config.difficulty,
      questionTypes: quiz.generation_config.questionTypes,
      focus: quiz.generation_config.focus,
      temperature: quiz.generation_config.temperature,
      seed: String(quiz.generation_config.seed ?? ""),
      title: quiz.title,
    };
  }

  return {
    translation: defaultTranslation(translations),
    book: "",
    startChapter: 1,
    startVerse: 1,
    endChapter: 1,
    endVerse: 5,
    questionCount: 5,
    difficulty: "medium",
    questionTypes: ["multiple_choice", "true_false"],
    focus: "mixed",
    temperature: 0.2,
    seed: "",
    title: "",
  };
};

export default function QuizForm({
  mode,
  initialQuiz = null,
  translations,
}: QuizFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialQuiz?.title ?? "");
  const [status, setStatus] = useState<QuizStatus>(
    initialQuiz?.status ?? "draft",
  );
  const [panel, setPanel] = useState<QuizGeneratePanelValues>(() =>
    buildInitialPanel(initialQuiz, translations),
  );
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuiz?.questions ?? [],
  );
  const [books, setBooks] = useState<BibleBookSummary[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const code = panel.translation;
    if (!code) {
      setBooks([]);
      return;
    }

    let cancelled = false;
    setBooksLoading(true);

    getBooksForTranslation(code)
      .then((nextBooks) => {
        if (cancelled) return;
        setBooks(nextBooks);
        setPanel((prev) => {
          if (
            prev.book &&
            !nextBooks.some((book) => book.name === prev.book)
          ) {
            return {
              ...prev,
              book: "",
              startChapter: 1,
              endChapter: 1,
              startVerse: 1,
              endVerse: 1,
            };
          }

          const selected = nextBooks.find((book) => book.name === prev.book);
          if (!selected) return prev;

          const maxChapter = Math.max(1, selected.chapters);
          const startChapter = Math.min(
            Math.max(prev.startChapter, 1),
            maxChapter,
          );
          const endChapter = Math.min(
            Math.max(prev.endChapter, startChapter),
            maxChapter,
          );
          if (
            startChapter === prev.startChapter &&
            endChapter === prev.endChapter
          ) {
            return prev;
          }
          return { ...prev, startChapter, endChapter };
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBooks([]);
        const message =
          error instanceof ApiError
            ? error.message
            : "Failed to load books for translation";
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [panel.translation]);

  const patchPanel = useCallback((patch: Partial<QuizGeneratePanelValues>) => {
    setPanel((prev) => ({ ...prev, ...patch }));
  }, []);

  const buildInput = (): QuizInput | null => {
    const trimmedTitle = title.trim() || panel.title.trim();
    if (!trimmedTitle) {
      toast.error("Title is required");
      return null;
    }
    if (!panel.book) {
      toast.error("Book is required");
      return null;
    }
    if (questions.length === 0) {
      toast.error("Add at least one question before saving");
      return null;
    }

    const seedNumber =
      panel.seed.trim() === ""
        ? Date.now() % 1_000_000_000
        : Number(panel.seed);

    return {
      title: trimmedTitle,
      status,
      translation_code: panel.translation,
      book: panel.book,
      start_chapter: panel.startChapter,
      start_verse: panel.startVerse,
      end_chapter: panel.endChapter,
      end_verse: panel.endVerse,
      generation_config: {
        difficulty: panel.difficulty,
        questionTypes: panel.questionTypes,
        focus: panel.focus,
        temperature: panel.temperature,
        seed: Number.isFinite(seedNumber) ? seedNumber : Date.now() % 1_000_000_000,
      },
      questions,
    };
  };

  const handleGenerate = async () => {
    if (!panel.book) {
      toast.error("Select a book before generating");
      return;
    }

    const request: QuizGenerateRequest = {
      translation: panel.translation,
      book: panel.book,
      start: { chapter: panel.startChapter, verse: panel.startVerse },
      end: { chapter: panel.endChapter, verse: panel.endVerse },
      questionCount: panel.questionCount,
      difficulty: panel.difficulty,
      questionTypes: panel.questionTypes,
      focus: panel.focus,
      temperature: panel.temperature,
      ...(panel.seed.trim()
        ? { seed: Number(panel.seed) }
        : {}),
      ...(panel.title.trim() ? { title: panel.title.trim() } : {}),
    };

    setGenerating(true);
    try {
      const { draft } = await generateAdminQuiz(request);
      const mapped = quizDraftToInput(draft, status);
      setTitle(mapped.title);
      setPanel((prev) => ({
        ...prev,
        translation: mapped.translation_code,
        book: mapped.book,
        startChapter: mapped.start_chapter,
        startVerse: mapped.start_verse,
        endChapter: mapped.end_chapter,
        endVerse: mapped.end_verse,
        difficulty: mapped.generation_config.difficulty,
        questionTypes: mapped.generation_config.questionTypes,
        focus: mapped.generation_config.focus,
        temperature: mapped.generation_config.temperature,
        seed: String(mapped.generation_config.seed),
        title: mapped.title,
        questionCount: Math.min(
          20,
          Math.max(3, draft.suggestedQuestionCount || prev.questionCount),
        ),
      }));
      setQuestions(mapped.questions);

      // Persist immediately so generated drafts survive refresh/navigation.
      if (mode === "create") {
        const { quiz } = await createAdminQuiz(mapped);
        toast.success("Draft saved");
        router.push(`/admin/quizzes/${quiz.id}/edit`);
        router.refresh();
        return;
      }

      if (initialQuiz) {
        await updateAdminQuiz(initialQuiz.id, mapped);
        toast.success("Draft updated — review questions, then save");
        router.refresh();
        return;
      }

      toast.success("Draft generated — review questions, then save");
    } catch (error: unknown) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to generate quiz draft";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const input = buildInput();
    if (!input) return;

    setSaving(true);
    try {
      if (mode === "create") {
        const { quiz } = await createAdminQuiz(input);
        toast.success("Quiz saved");
        router.push(`/admin/quizzes/${quiz.id}/edit`);
        router.refresh();
        return;
      }

      if (!initialQuiz) {
        toast.error("Missing quiz id");
        return;
      }

      await updateAdminQuiz(initialQuiz.id, input);
      toast.success("Quiz updated");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Failed to save quiz";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialQuiz || mode !== "edit") return;
    const confirmed = window.confirm(
      `Delete “${initialQuiz.title}”? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteAdminQuiz(initialQuiz.id);
      toast.success("Quiz deleted");
      router.push("/admin/quizzes");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Failed to delete quiz";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const busy = generating || saving || deleting;

  return (
    <div className={styles.formShell}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <p className={styles.toolbarEyebrow}>
            {mode === "create" ? "New quiz" : "Edit quiz"}
          </p>
          <p className={styles.toolbarTitle}>
            {title.trim() || "Untitled quiz"}
          </p>
        </div>
        <div className={styles.toolbarActions}>
          {mode === "edit" ? (
            <Button
              type="button"
              className={btnDanger}
              disabled={busy}
              onClick={handleDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          ) : null}
          <Button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => router.push("/admin/quizzes")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className={styles.form}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>Details</p>
            <h3 className={styles.sectionTitle}>Quiz metadata</h3>
          </div>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className={styles.label} htmlFor="quiz-title">
                Title
              </label>
              <input
                id="quiz-title"
                type="text"
                className={styles.control}
                value={title}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Status</span>
              <Combobox
                options={STATUS_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                  description: item.description,
                  keywords: [item.value, item.label],
                }))}
                value={status}
                onValueChange={(value) => setStatus(value as QuizStatus)}
                disabled={busy}
                placeholder="Choose status"
                searchPlaceholder="Type status…"
                emptyMessage="No statuses match."
                triggerClassName={`${styles.control} w-full min-w-0 max-w-full`}
                aria-label="Quiz status"
              />
              <p className={styles.helper}>
                {
                  STATUS_OPTIONS.find((item) => item.value === status)
                    ?.description
                }
              </p>
            </div>
          </div>
        </section>

        <QuizGeneratePanel
          values={panel}
          translations={translations}
          books={books}
          booksLoading={booksLoading}
          generating={generating}
          disabled={busy && !generating}
          onChange={patchPanel}
          onGenerate={handleGenerate}
        />

        <QuizQuestionsEditor
          questions={questions}
          disabled={busy}
          onChange={setQuestions}
        />
      </div>
    </div>
  );
}
