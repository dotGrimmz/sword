import type { Quiz } from "@/types/quizzes";

export type ChapterPackJob = {
  chapter: number;
  /** Prefer omitting so the generate API sizes each chapter itself. */
  titleHint: string;
};

export type ChapterPackPlan = {
  book: string;
  translation: string;
  chapterCount: number;
  jobs: ChapterPackJob[];
};

/** Build one generate job per chapter in the book. */
export function planChapterPack(options: {
  book: string;
  translation: string;
  chapterCount: number;
}): ChapterPackPlan {
  const chapterCount = Math.max(0, Math.floor(options.chapterCount));
  const jobs: ChapterPackJob[] = [];
  for (let chapter = 1; chapter <= chapterCount; chapter += 1) {
    jobs.push({
      chapter,
      titleHint: `${options.book} ${chapter}`,
    });
  }
  return {
    book: options.book,
    translation: options.translation,
    chapterCount,
    jobs,
  };
}

/**
 * True when an existing quiz already covers exactly this single chapter
 * (any verse span inside the chapter). Archived quizzes do not block.
 */
export function hasExistingChapterQuiz(
  quizzes: Array<
    Pick<
      Quiz,
      | "book"
      | "translation_code"
      | "start_chapter"
      | "end_chapter"
      | "status"
    >
  >,
  options: {
    book: string;
    translation: string;
    chapter: number;
  },
): boolean {
  const book = options.book.trim().toLowerCase();
  const translation = options.translation.trim().toUpperCase();
  return quizzes.some(
    (quiz) =>
      quiz.status !== "archived" &&
      quiz.book.trim().toLowerCase() === book &&
      quiz.translation_code.trim().toUpperCase() === translation &&
      quiz.start_chapter === options.chapter &&
      quiz.end_chapter === options.chapter,
  );
}

export type ChapterPackProgress = {
  status: "running" | "done" | "cancelled";
  total: number;
  index: number;
  chapter: number;
  created: number;
  skipped: number;
  failed: number;
  message: string;
};
