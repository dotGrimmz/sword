import type {
  PublicQuizDetail,
  PublicQuizQuestion,
  PublicQuizSummary,
  Quiz,
  QuizQuestion,
} from "@/types/quizzes";

export function toPublicQuizSummary(quiz: Quiz): PublicQuizSummary {
  return {
    id: quiz.id,
    title: quiz.title,
    translation_code: quiz.translation_code,
    book: quiz.book,
    start_chapter: quiz.start_chapter,
    start_verse: quiz.start_verse,
    end_chapter: quiz.end_chapter,
    end_verse: quiz.end_verse,
    question_count: quiz.question_count,
    max_attempts: quiz.max_attempts,
    updated_at: quiz.updated_at,
  };
}

export function toPublicQuizQuestion(
  question: QuizQuestion,
): PublicQuizQuestion {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    citation: question.citation,
  };
}

export function toPublicQuizDetail(quiz: Quiz): PublicQuizDetail {
  return {
    ...toPublicQuizSummary(quiz),
    questions: quiz.questions.map(toPublicQuizQuestion),
  };
}

export function formatQuizPassageRef(quiz: {
  book: string;
  start_chapter: number;
  start_verse: number;
  end_chapter: number;
  end_verse: number;
}): string {
  const sameChapter = quiz.start_chapter === quiz.end_chapter;
  const sameVerse =
    sameChapter && quiz.start_verse === quiz.end_verse;

  if (sameVerse) {
    return `${quiz.book} ${quiz.start_chapter}:${quiz.start_verse}`;
  }
  if (sameChapter) {
    return `${quiz.book} ${quiz.start_chapter}:${quiz.start_verse}–${quiz.end_verse}`;
  }
  return `${quiz.book} ${quiz.start_chapter}:${quiz.start_verse}–${quiz.end_chapter}:${quiz.end_verse}`;
}
