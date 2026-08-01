"use client";

import { Button } from "@/components/ui/button";
import type { BibleBookSummary, BibleTranslationSummary } from "@/types/bible";
import type {
  QuizDifficulty,
  QuizFocus,
  QuizQuestionType,
} from "@/types/quizzes";

import styles from "./QuizForm.module.css";

const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];
const FOCUSES: QuizFocus[] = ["factual", "thematic", "application", "mixed"];
const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "short_answer", label: "Short answer" },
];

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
  "h-14 min-h-14 min-w-[8.5rem] px-6 text-base md:h-11 md:min-h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-0 bg-gradient-to-br from-[#d91f26] to-[#f28c00] text-white font-bold shadow-[0_10px_24px_color-mix(in_oklab,#d91f26_28%,transparent)] hover:brightness-105 hover:text-white cursor-pointer";

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
  const toggleType = (type: QuizQuestionType) => {
    const has = values.questionTypes.includes(type);
    if (has && values.questionTypes.length === 1) return;
    onChange({
      questionTypes: has
        ? values.questionTypes.filter((item) => item !== type)
        : [...values.questionTypes, type],
    });
  };

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
          <label className={styles.label} htmlFor="quiz-translation">
            Translation
          </label>
          <select
            id="quiz-translation"
            className={styles.control}
            value={values.translation}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ translation: event.target.value, book: "" })
            }
          >
            {translations.length === 0 ? (
              <option value="">No translations</option>
            ) : null}
            {translations.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code}
                {item.name ? ` · ${item.name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-book">
            Book
          </label>
          <select
            id="quiz-book"
            className={styles.control}
            value={values.book}
            disabled={disabled || generating || booksLoading}
            onChange={(event) => onChange({ book: event.target.value })}
          >
            <option value="">
              {booksLoading ? "Loading books…" : "Select a book"}
            </option>
            {books.map((book) => (
              <option key={book.id} value={book.name}>
                {book.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-start-chapter">
            Start chapter
          </label>
          <input
            id="quiz-start-chapter"
            type="number"
            min={1}
            className={styles.control}
            value={values.startChapter}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ startChapter: Number(event.target.value) || 1 })
            }
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-start-verse">
            Start verse
          </label>
          <input
            id="quiz-start-verse"
            type="number"
            min={1}
            className={styles.control}
            value={values.startVerse}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ startVerse: Number(event.target.value) || 1 })
            }
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-end-chapter">
            End chapter
          </label>
          <input
            id="quiz-end-chapter"
            type="number"
            min={1}
            className={styles.control}
            value={values.endChapter}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ endChapter: Number(event.target.value) || 1 })
            }
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-end-verse">
            End verse
          </label>
          <input
            id="quiz-end-verse"
            type="number"
            min={1}
            className={styles.control}
            value={values.endVerse}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ endVerse: Number(event.target.value) || 1 })
            }
          />
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-difficulty">
            Difficulty
          </label>
          <select
            id="quiz-difficulty"
            className={styles.control}
            value={values.difficulty}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ difficulty: event.target.value as QuizDifficulty })
            }
          >
            {DIFFICULTIES.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-focus">
            Focus
          </label>
          <select
            id="quiz-focus"
            className={styles.control}
            value={values.focus}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ focus: event.target.value as QuizFocus })
            }
          >
            {FOCUSES.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-question-count">
            Question count
          </label>
          <input
            id="quiz-question-count"
            type="number"
            min={3}
            max={20}
            className={styles.control}
            value={values.questionCount}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ questionCount: Number(event.target.value) || 5 })
            }
          />
          <p className={styles.helper}>Between 3 and 20.</p>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="quiz-temperature">
            Variation
          </label>
          <input
            id="quiz-temperature"
            type="number"
            min={0}
            max={1}
            step={0.1}
            className={styles.control}
            value={values.temperature}
            disabled={disabled || generating}
            onChange={(event) =>
              onChange({ temperature: Number(event.target.value) || 0 })
            }
          />
          <p className={styles.helper}>OpenAI temperature (0–1).</p>
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
                  className={active ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                  disabled={disabled || generating}
                  aria-pressed={active}
                  onClick={() => toggleType(item.value)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
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
            disabled={disabled || generating}
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
            disabled={disabled || generating}
            placeholder="Optional hint for the model"
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </div>
      </div>

      <div className={styles.generateActions}>
        <Button
          type="button"
          className={btnPrimary}
          disabled={disabled || generating || !values.book}
          onClick={onGenerate}
        >
          {generating ? "Generating…" : "Generate draft"}
        </Button>
      </div>
    </section>
  );
}
