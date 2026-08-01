"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { BookCombobox } from "@/components/bible/BookCombobox";
import {
  formatVerseRange,
  parseVerseRangeValue,
  VerseRangePicker,
} from "@/components/bible/VerseRangePicker";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  QUIZ_QUESTION_COUNT_BOUNDS,
  suggestQuizQuestionCount,
} from "@/lib/quizzes/suggest-count";
import type {
  BibleBookSummary,
  BibleChapterResponse,
  BibleTranslationSummary,
} from "@/types/bible";
import type {
  QuizDifficulty,
  QuizFocus,
  QuizQuestionType,
} from "@/types/quizzes";

import styles from "./QuizForm.module.css";

const CHAPTER_ENDPOINT = (
  translation: string,
  book: string,
  chapter: number,
) =>
  `/api/bible/${encodeURIComponent(book)}/${chapter}?translation=${encodeURIComponent(translation)}`;

const loadChapterVerseCount = async (
  translation: string,
  book: string,
  chapter: number,
  signal: AbortSignal,
) => {
  const response = await fetch(CHAPTER_ENDPOINT(translation, book, chapter), {
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Unable to load chapter metadata");
  }
  const payload = (await response.json()) as BibleChapterResponse;
  const count = Array.isArray(payload.verses) ? payload.verses.length : 0;
  return count > 0 ? count : null;
};

const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];
const FOCUS_OPTIONS: {
  value: QuizFocus;
  label: string;
  description: string;
}[] = [
  {
    value: "factual",
    label: "Factual",
    description: "Who, what, where, when — recall details from the passage.",
  },
  {
    value: "thematic",
    label: "Thematic",
    description: "Main ideas, themes, and how the passage fits together.",
  },
  {
    value: "application",
    label: "Application",
    description: "How the passage applies to life, faith, and practice.",
  },
  {
    value: "mixed",
    label: "Mixed",
    description: "Blend of factual, thematic, and application questions.",
  },
];
const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "short_answer", label: "Short answer" },
];

/** Named presets for model temperature — keep the UI free of API jargon. */
const VARIATION_OPTIONS: {
  value: number;
  label: string;
  description: string;
}[] = [
  {
    value: 0.2,
    label: "Steady",
    description:
      "Reliable and consistent. Regenerating usually produces similar questions.",
  },
  {
    value: 0.5,
    label: "Balanced",
    description:
      "Some fresh wording while staying close to the passage.",
  },
  {
    value: 0.8,
    label: "Creative",
    description:
      "More varied angles and phrasing. Good when you want a different cut of the same text.",
  },
];

const nearestVariation = (temperature: number) => {
  let best = VARIATION_OPTIONS[0];
  let bestDistance = Math.abs(temperature - best.value);
  for (const option of VARIATION_OPTIONS) {
    const distance = Math.abs(temperature - option.value);
    if (distance < bestDistance) {
      best = option;
      bestDistance = distance;
    }
  }
  return best;
};

export type QuizGeneratePanelValues = {
  translation: string;
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  questionCount: number;
  difficulty: QuizDifficulty;
  questionTypes: QuizQuestionType[];
  focus: QuizFocus;
  temperature: number;
  seed: string;
  title: string;
};

type QuizGeneratePanelProps = {
  values: QuizGeneratePanelValues;
  translations: BibleTranslationSummary[];
  books: BibleBookSummary[];
  booksLoading: boolean;
  generating: boolean;
  disabled?: boolean;
  onChange: (patch: Partial<QuizGeneratePanelValues>) => void;
  onGenerate: () => void;
};

const btnPrimary =
  "h-16 min-h-16 min-w-[10rem] px-8 text-base border-0 bg-gradient-to-br from-[#d91f26] to-[#f28c00] text-white font-bold shadow-[0_10px_24px_color-mix(in_oklab,#d91f26_28%,transparent)] hover:brightness-105 hover:text-white cursor-pointer";

const clampInt = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Estimate selected passage size once chapter verse bounds are known. */
const estimateSelectedVerseCount = (options: {
  startChapter: number;
  endChapter: number;
  startVerse: number;
  endVerse: number;
  startVerseCount: number | null;
  endVerseCount: number | null;
}): number | null => {
  const {
    startChapter,
    endChapter,
    startVerse,
    endVerse,
    startVerseCount,
    endVerseCount,
  } = options;

  if (startChapter === endChapter) {
    if (!startVerseCount) return null;
    const start = clampInt(startVerse, 1, startVerseCount);
    const end = clampInt(endVerse, start, startVerseCount);
    return end - start + 1;
  }

  if (!startVerseCount || !endVerseCount) return null;
  const startPart = Math.max(0, startVerseCount - clampInt(startVerse, 1, startVerseCount) + 1);
  const endPart = clampInt(endVerse, 1, endVerseCount);
  const middleChapters = Math.max(0, endChapter - startChapter - 1);
  const avgChapterLen = (startVerseCount + endVerseCount) / 2;
  return Math.max(
    1,
    Math.round(startPart + endPart + middleChapters * avgChapterLen),
  );
};

export default function QuizGeneratePanel({
  values,
  translations,
  books,
  booksLoading,
  generating,
  disabled = false,
  onChange,
  onGenerate,
}: QuizGeneratePanelProps) {
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [startVerseCount, setStartVerseCount] = useState<number | null>(null);
  const [endVerseCount, setEndVerseCount] = useState<number | null>(null);
  const [loadingStartVerses, setLoadingStartVerses] = useState(false);
  const [loadingEndVerses, setLoadingEndVerses] = useState(false);
  const startLoadGenRef = useRef(0);
  const endLoadGenRef = useRef(0);
  const lastSuggestionKeyRef = useRef<string | null>(null);

  const selectedBook = useMemo(
    () => books.find((book) => book.name === values.book) ?? null,
    [books, values.book],
  );

  const estimatedVerseCount = useMemo(
    () =>
      estimateSelectedVerseCount({
        startChapter: values.startChapter,
        endChapter: values.endChapter,
        startVerse: values.startVerse,
        endVerse: values.endVerse,
        startVerseCount,
        endVerseCount,
      }),
    [
      values.startChapter,
      values.endChapter,
      values.startVerse,
      values.endVerse,
      startVerseCount,
      endVerseCount,
    ],
  );

  const suggestedQuestionCount = useMemo(() => {
    if (estimatedVerseCount == null || !values.book) return null;
    return suggestQuizQuestionCount({
      verseCount: estimatedVerseCount,
      difficulty: values.difficulty,
      focus: values.focus,
      questionTypes: values.questionTypes,
    });
  }, [
    estimatedVerseCount,
    values.book,
    values.difficulty,
    values.focus,
    values.questionTypes,
  ]);

  const suggestionKey = useMemo(() => {
    if (suggestedQuestionCount == null) return null;
    return [
      values.translation,
      values.book,
      values.startChapter,
      values.startVerse,
      values.endChapter,
      values.endVerse,
      values.difficulty,
      values.focus,
      [...values.questionTypes].sort().join("+"),
      suggestedQuestionCount,
    ].join("|");
  }, [
    suggestedQuestionCount,
    values.translation,
    values.book,
    values.startChapter,
    values.startVerse,
    values.endChapter,
    values.endVerse,
    values.difficulty,
    values.focus,
    values.questionTypes,
  ]);

  // When passage/knobs change, refresh the suggested count (user can still nudge).
  useEffect(() => {
    if (suggestionKey == null || suggestedQuestionCount == null) return;
    if (lastSuggestionKeyRef.current === suggestionKey) return;
    lastSuggestionKeyRef.current = suggestionKey;
    if (valuesRef.current.questionCount !== suggestedQuestionCount) {
      onChangeRef.current({ questionCount: suggestedQuestionCount });
    }
  }, [suggestionKey, suggestedQuestionCount]);

  const chapterOptions = useMemo(() => {
    if (!selectedBook) return [];
    return Array.from({ length: Math.max(selectedBook.chapters, 1) }, (_v, i) =>
      i + 1,
    );
  }, [selectedBook]);

  const sameChapter = values.startChapter === values.endChapter;
  const busy = disabled || generating;
  const controlClass = `${styles.control} w-full min-w-0 max-w-full`;

  const chapterComboboxOptions = useMemo(
    () =>
      chapterOptions.map((chapter) => ({
        value: String(chapter),
        label: `Chapter ${chapter}`,
        keywords: [String(chapter)],
      })),
    [chapterOptions],
  );

  const translationOptions = useMemo(
    () =>
      translations.map((item) => ({
        value: item.code,
        label: item.name ? `${item.code} · ${item.name}` : item.code,
        keywords: [item.code, item.name].filter(Boolean) as string[],
      })),
    [translations],
  );

  const difficultyOptions = useMemo(
    () =>
      DIFFICULTIES.map((item) => ({
        value: item,
        label: item.charAt(0).toUpperCase() + item.slice(1),
        keywords: [item],
      })),
    [],
  );

  const focusOptions = useMemo(
    () =>
      FOCUS_OPTIONS.map((item) => ({
        value: item.value,
        label: item.label,
        description: item.description,
        keywords: [item.value, item.label],
      })),
    [],
  );

  const selectedFocusDescription =
    FOCUS_OPTIONS.find((item) => item.value === values.focus)?.description ??
    null;

  const selectedVariation = nearestVariation(values.temperature);

  const variationOptions = useMemo(
    () =>
      VARIATION_OPTIONS.map((item) => ({
        value: String(item.value),
        label: item.label,
        description: item.description,
        keywords: [item.label, String(item.value)],
      })),
    [],
  );

  const startVerseOptions = useMemo(() => {
    if (!startVerseCount || startVerseCount < 1) return [];
    return Array.from({ length: startVerseCount }, (_v, i) => {
      const verse = i + 1;
      return {
        value: String(verse),
        label: String(verse),
        keywords: [String(verse)],
      };
    });
  }, [startVerseCount]);

  const endVerseOptions = useMemo(() => {
    if (!endVerseCount || endVerseCount < 1) return [];
    return Array.from({ length: endVerseCount }, (_v, i) => {
      const verse = i + 1;
      return {
        value: String(verse),
        label: String(verse),
        keywords: [String(verse)],
      };
    });
  }, [endVerseCount]);

  // Hydrate start-chapter verse bounds (and end bounds when same chapter).
  useEffect(() => {
    const { translation, book, startChapter, endChapter } = valuesRef.current;
    const generation = ++startLoadGenRef.current;
    const controller = new AbortController();

    if (!translation || !book || !Number.isFinite(startChapter) || startChapter < 1) {
      setStartVerseCount(null);
      setLoadingStartVerses(false);
      if (endChapter === startChapter) {
        setEndVerseCount(null);
        setLoadingEndVerses(false);
      }
      return () => {
        controller.abort();
      };
    }

    setLoadingStartVerses(true);

    void (async () => {
      try {
        const verseCount = await loadChapterVerseCount(
          translation,
          book,
          startChapter,
          controller.signal,
        );
        if (generation !== startLoadGenRef.current) return;

        setStartVerseCount(verseCount);
        if (!verseCount) {
          if (valuesRef.current.startChapter === valuesRef.current.endChapter) {
            setEndVerseCount(null);
          }
          return;
        }

        const current = valuesRef.current;
        const nextStart = clampInt(current.startVerse, 1, verseCount);
        const patch: Partial<QuizGeneratePanelValues> = {};
        if (nextStart !== current.startVerse) {
          patch.startVerse = nextStart;
        }

        if (current.startChapter === current.endChapter) {
          setEndVerseCount(verseCount);
          setLoadingEndVerses(false);
          const nextEnd = clampInt(
            Math.max(current.endVerse, nextStart),
            nextStart,
            verseCount,
          );
          if (nextEnd !== current.endVerse) {
            patch.endVerse = nextEnd;
          }
        }

        if (Object.keys(patch).length > 0) {
          onChangeRef.current(patch);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (generation !== startLoadGenRef.current) return;
        setStartVerseCount(null);
        if (valuesRef.current.startChapter === valuesRef.current.endChapter) {
          setEndVerseCount(null);
        }
      } finally {
        if (generation === startLoadGenRef.current) {
          setLoadingStartVerses(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [values.translation, values.book, values.startChapter]);

  // Hydrate end-chapter verse bounds when the range spans chapters.
  useEffect(() => {
    const { translation, book, startChapter, endChapter } = valuesRef.current;
    const generation = ++endLoadGenRef.current;
    const controller = new AbortController();

    if (startChapter === endChapter) {
      // Start-chapter effect owns end bounds for same-chapter ranges.
      setLoadingEndVerses(false);
      return () => {
        controller.abort();
      };
    }

    if (!translation || !book || !Number.isFinite(endChapter) || endChapter < 1) {
      setEndVerseCount(null);
      setLoadingEndVerses(false);
      return () => {
        controller.abort();
      };
    }

    setLoadingEndVerses(true);

    void (async () => {
      try {
        const verseCount = await loadChapterVerseCount(
          translation,
          book,
          endChapter,
          controller.signal,
        );
        if (generation !== endLoadGenRef.current) return;

        setEndVerseCount(verseCount);
        if (!verseCount) return;

        const current = valuesRef.current;
        const nextEnd = clampInt(current.endVerse, 1, verseCount);
        if (nextEnd !== current.endVerse) {
          onChangeRef.current({ endVerse: nextEnd });
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        if (generation !== endLoadGenRef.current) return;
        setEndVerseCount(null);
      } finally {
        if (generation === endLoadGenRef.current) {
          setLoadingEndVerses(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [values.translation, values.book, values.startChapter, values.endChapter]);

  const toggleType = (type: QuizQuestionType) => {
    const has = values.questionTypes.includes(type);
    if (has && values.questionTypes.length === 1) return;
    onChange({
      questionTypes: has
        ? values.questionTypes.filter((item) => item !== type)
        : [...values.questionTypes, type],
    });
  };

  const handleBookSelect = (bookName: string) => {
    onChange({
      book: bookName,
      startChapter: 1,
      endChapter: 1,
      startVerse: 1,
      endVerse: 1,
    });
    setStartVerseCount(null);
    setEndVerseCount(null);
  };

  const handleStartChapterSelect = (raw: string) => {
    const chapter = Number.parseInt(raw, 10);
    if (!Number.isFinite(chapter)) return;
    const maxChapter = selectedBook?.chapters ?? chapter;
    const startChapter = clampInt(chapter, 1, maxChapter);
    const endChapter = Math.max(startChapter, values.endChapter);
    onChange({
      startChapter,
      endChapter,
      startVerse: 1,
      endVerse: startChapter === endChapter ? 1 : values.endVerse,
    });
    setStartVerseCount(null);
    if (startChapter === endChapter) {
      setEndVerseCount(null);
    }
  };

  const handleEndChapterSelect = (raw: string) => {
    const chapter = Number.parseInt(raw, 10);
    if (!Number.isFinite(chapter)) return;
    const maxChapter = selectedBook?.chapters ?? chapter;
    const endChapter = clampInt(chapter, 1, maxChapter);
    const startChapter = Math.min(values.startChapter, endChapter);
    onChange({
      startChapter,
      endChapter,
      startVerse: startChapter === endChapter ? 1 : values.startVerse,
      endVerse: 1,
    });
    setEndVerseCount(null);
    if (startChapter === endChapter) {
      setStartVerseCount(null);
    }
  };

  const handleSameChapterVerses = (range: string) => {
    const parsed = parseVerseRangeValue(range);
    if (!parsed) return;
    onChange({ startVerse: parsed.start, endVerse: parsed.end });
  };

  const handleStartVerseSelect = (raw: string) => {
    const verse = Number.parseInt(raw, 10);
    if (!Number.isFinite(verse) || !startVerseCount) return;
    onChange({ startVerse: clampInt(verse, 1, startVerseCount) });
  };

  const handleEndVerseSelect = (raw: string) => {
    const verse = Number.parseInt(raw, 10);
    if (!Number.isFinite(verse) || !endVerseCount) return;
    onChange({ endVerse: clampInt(verse, 1, endVerseCount) });
  };

  const rangeReady =
    Boolean(values.book) &&
    startVerseCount != null &&
    endVerseCount != null &&
    !loadingStartVerses &&
    !(loadingEndVerses && !sameChapter);

  const verseHelper = (() => {
    if (!selectedBook) return "Pick a book to unlock chapter and verse bounds.";
    if (loadingStartVerses || (loadingEndVerses && !sameChapter)) {
      return "Loading verse bounds…";
    }
    if (sameChapter && startVerseCount) {
      return `Chapter ${values.startChapter} has ${startVerseCount} verses.`;
    }
    if (!sameChapter && startVerseCount && endVerseCount) {
      return `Start ch. ${values.startChapter}: ${startVerseCount} verses · End ch. ${values.endChapter}: ${endVerseCount} verses.`;
    }
    return "Pick chapters to unlock verse bounds.";
  })();

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionEyebrow}>Passage</p>
        <h3 className={styles.sectionTitle}>Generate from scripture</h3>
        <p className={styles.sectionMeta}>
          Choose a translation and range, tune the knobs, then generate a draft.
          Nothing is saved until you hit Save.
        </p>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <span className={styles.label}>Translation</span>
          <Combobox
            options={translationOptions}
            value={values.translation || undefined}
            onValueChange={(code) =>
              onChange({
                translation: code,
                book: "",
                startChapter: 1,
                endChapter: 1,
                startVerse: 1,
                endVerse: 1,
              })
            }
            disabled={busy || translations.length === 0}
            placeholder={
              translations.length === 0
                ? "No translations"
                : "Choose a translation"
            }
            searchPlaceholder="Type a translation (e.g. WEB, NKJV)…"
            emptyMessage="No translations match."
            triggerClassName={controlClass}
            aria-label="Translation"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Book</span>
          <BookCombobox
            books={books}
            value={values.book || undefined}
            valueKey="name"
            onValueChange={handleBookSelect}
            disabled={busy || booksLoading}
            placeholder={booksLoading ? "Loading books…" : "Choose a book"}
            searchPlaceholder="Type a book (e.g. gen, john)…"
            triggerClassName={controlClass}
            aria-label="Bible book"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Start chapter</span>
          <Combobox
            options={chapterComboboxOptions}
            value={
              selectedBook && values.startChapter
                ? String(values.startChapter)
                : undefined
            }
            onValueChange={handleStartChapterSelect}
            disabled={busy || !selectedBook}
            placeholder={
              selectedBook ? "Choose a chapter" : "Select a book first"
            }
            searchPlaceholder="Type a chapter number…"
            emptyMessage="No chapters match."
            triggerClassName={controlClass}
            aria-label="Start chapter"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>End chapter</span>
          <Combobox
            options={chapterComboboxOptions}
            value={
              selectedBook && values.endChapter
                ? String(values.endChapter)
                : undefined
            }
            onValueChange={handleEndChapterSelect}
            disabled={busy || !selectedBook}
            placeholder={
              selectedBook ? "Choose a chapter" : "Select a book first"
            }
            searchPlaceholder="Type a chapter number…"
            emptyMessage="No chapters match."
            triggerClassName={controlClass}
            aria-label="End chapter"
          />
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.label}>Verses</span>
          {sameChapter ? (
            <VerseRangePicker
              verseCount={startVerseCount}
              value={formatVerseRange(values.startVerse, values.endVerse)}
              onValueChange={handleSameChapterVerses}
              disabled={busy || loadingStartVerses}
              triggerClassName={controlClass}
            />
          ) : (
            <div className={styles.verseSplit}>
              <div className={styles.field}>
                <span className={styles.verseSubLabel}>Start verse</span>
                <Combobox
                  options={startVerseOptions}
                  value={
                    startVerseCount ? String(values.startVerse) : undefined
                  }
                  onValueChange={handleStartVerseSelect}
                  disabled={busy || loadingStartVerses || !startVerseCount}
                  placeholder={
                    startVerseCount ? "Start verse" : "Loading…"
                  }
                  searchPlaceholder="Verse…"
                  emptyMessage="No verses."
                  triggerClassName={controlClass}
                  aria-label="Start verse"
                />
              </div>
              <div className={styles.field}>
                <span className={styles.verseSubLabel}>End verse</span>
                <Combobox
                  options={endVerseOptions}
                  value={endVerseCount ? String(values.endVerse) : undefined}
                  onValueChange={handleEndVerseSelect}
                  disabled={busy || loadingEndVerses || !endVerseCount}
                  placeholder={endVerseCount ? "End verse" : "Loading…"}
                  searchPlaceholder="Verse…"
                  emptyMessage="No verses."
                  triggerClassName={controlClass}
                  aria-label="End verse"
                />
              </div>
            </div>
          )}
          <p className={styles.helper}>{verseHelper}</p>
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <span className={styles.label}>Difficulty</span>
          <Combobox
            options={difficultyOptions}
            value={values.difficulty}
            onValueChange={(value) =>
              onChange({ difficulty: value as QuizDifficulty })
            }
            disabled={busy}
            placeholder="Choose difficulty"
            searchPlaceholder="Type difficulty…"
            emptyMessage="No difficulties match."
            triggerClassName={controlClass}
            aria-label="Difficulty"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Focus</span>
          <Combobox
            options={focusOptions}
            value={values.focus}
            onValueChange={(value) =>
              onChange({ focus: value as QuizFocus })
            }
            disabled={busy}
            placeholder="Choose focus"
            searchPlaceholder="Type focus…"
            emptyMessage="No focuses match."
            triggerClassName={controlClass}
            aria-label="Focus"
          />
          {selectedFocusDescription ? (
            <p className={styles.helper}>{selectedFocusDescription}</p>
          ) : null}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Question variety</span>
          <Combobox
            options={variationOptions}
            value={String(selectedVariation.value)}
            onValueChange={(value) =>
              onChange({ temperature: Number(value) || 0.2 })
            }
            disabled={busy}
            placeholder="Choose variety"
            searchPlaceholder="Type Steady, Balanced…"
            emptyMessage="No options match."
            triggerClassName={controlClass}
            aria-label="Question variety"
          />
          <p className={styles.helper}>{selectedVariation.description}</p>
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.label}>Question types</span>
          <div className={styles.chipGroup}>
            {QUESTION_TYPES.map((item) => {
              const active = values.questionTypes.includes(item.value);
              return (
                <button
                  key={item.value}
                  type="button"
                  className={
                    active ? `${styles.chip} ${styles.chipActive}` : styles.chip
                  }
                  disabled={busy}
                  aria-pressed={active}
                  onClick={() => toggleType(item.value)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.label}>Suggested question count</span>
          {suggestedQuestionCount == null ? (
            <p className={styles.helper}>
              Choose a passage, difficulty, focus, and question types to unlock a
              suggested count.
            </p>
          ) : (
            <>
              <div className={styles.countStepper}>
                <button
                  type="button"
                  className={styles.countStepperButton}
                  disabled={
                    busy || values.questionCount <= QUIZ_QUESTION_COUNT_BOUNDS.min
                  }
                  aria-label="Fewer questions"
                  onClick={() =>
                    onChange({
                      questionCount: clampInt(
                        values.questionCount - 1,
                        QUIZ_QUESTION_COUNT_BOUNDS.min,
                        QUIZ_QUESTION_COUNT_BOUNDS.max,
                      ),
                    })
                  }
                >
                  −
                </button>
                <div className={styles.countStepperValue} aria-live="polite">
                  <span className={styles.countStepperNumber}>
                    {values.questionCount}
                  </span>
                  <span className={styles.countStepperMeta}>
                    {values.questionCount === suggestedQuestionCount
                      ? "suggested"
                      : `suggested ${suggestedQuestionCount}`}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.countStepperButton}
                  disabled={
                    busy || values.questionCount >= QUIZ_QUESTION_COUNT_BOUNDS.max
                  }
                  aria-label="More questions"
                  onClick={() =>
                    onChange({
                      questionCount: clampInt(
                        values.questionCount + 1,
                        QUIZ_QUESTION_COUNT_BOUNDS.min,
                        QUIZ_QUESTION_COUNT_BOUNDS.max,
                      ),
                    })
                  }
                >
                  +
                </button>
                {values.questionCount !== suggestedQuestionCount ? (
                  <button
                    type="button"
                    className={styles.countResetButton}
                    disabled={busy}
                    onClick={() =>
                      onChange({ questionCount: suggestedQuestionCount })
                    }
                  >
                    Reset to suggested
                  </button>
                ) : null}
              </div>
              <p className={styles.helper}>
                Based on about {estimatedVerseCount} verse
                {estimatedVerseCount === 1 ? "" : "s"} in this range,{" "}
                {values.difficulty} difficulty, and {values.focus} focus. Nudge
                up or down if you want a shorter or deeper quiz.
              </p>
            </>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-seed">
            Seed (optional)
          </label>
          <input
            id="quiz-seed"
            type="number"
            className={styles.control}
            value={values.seed}
            disabled={busy}
            placeholder="Auto"
            onChange={(event) => onChange({ seed: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-gen-title">
            Suggested title
          </label>
          <input
            id="quiz-gen-title"
            type="text"
            className={styles.control}
            value={values.title}
            disabled={busy}
            placeholder="Optional hint for the model"
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </div>
      </div>

      <div className={styles.generateActions}>
        <Button
          type="button"
          className={btnPrimary}
          disabled={busy || !rangeReady}
          onClick={onGenerate}
        >
          {generating ? "Generating…" : "Generate draft"}
        </Button>
      </div>
    </section>
  );
}
