import type {
  QuizDifficulty,
  QuizFocus,
  QuizQuestionType,
} from "@/types/quizzes";

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 20;

/** verseCount ≤ maxVerses → suggested question count */
const COUNT_BANDS = [
  { maxVerses: 4, count: 3 },
  { maxVerses: 12, count: 5 },
  { maxVerses: 25, count: 8 },
  { maxVerses: 40, count: 12 },
  { maxVerses: Infinity, count: 15 },
] as const;

export const QUIZ_QUESTION_COUNT_BOUNDS = {
  min: MIN_QUESTIONS,
  max: MAX_QUESTIONS,
} as const;

const baseCountFromVerseCount = (verseCount: number) => {
  const band = COUNT_BANDS.find(({ maxVerses }) => verseCount <= maxVerses);
  return Math.min(MAX_QUESTIONS, band?.count ?? MIN_QUESTIONS);
};

/**
 * Suggest a quality question count from passage size + generation knobs.
 * Callers may let admins nudge ± from this baseline before generate.
 */
export function suggestQuizQuestionCount(options: {
  verseCount: number;
  difficulty?: QuizDifficulty;
  focus?: QuizFocus;
  questionTypes?: QuizQuestionType[];
  /** When set, multi-chapter / book spans lean toward fuller overview quizzes. */
  chapterCount?: number;
}): number {
  const verseCount = Math.max(0, Math.floor(options.verseCount));
  const chapterCount = Math.max(1, Math.floor(options.chapterCount ?? 1));
  let count = baseCountFromVerseCount(verseCount);

  // Book/section overviews should sit near the top of the allowed band.
  if (chapterCount >= 20 || verseCount >= 800) {
    count = Math.max(count, 18);
  } else if (chapterCount >= 8 || verseCount >= 200) {
    count = Math.max(count, 16);
  } else if (chapterCount >= 4 || verseCount >= 80) {
    count = Math.max(count, 14);
  }

  if (options.difficulty === "easy") count -= 1;
  if (options.difficulty === "hard") count += 2;

  if (options.focus === "application" || options.focus === "thematic") {
    count += 1;
  }

  const typeCount = new Set(options.questionTypes ?? []).size;
  if (typeCount >= 3) count += 1;

  // Very short passages cannot support a large quiz well.
  // Skip this clamp for multi-chapter overviews where verseCount is large
  // but questions intentionally sample themes rather than every verse.
  if (verseCount > 0 && chapterCount < 4 && verseCount < 80) {
    count = Math.min(count, Math.max(MIN_QUESTIONS, verseCount + 2));
  }

  return Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, count));
}
