import type {
  QuizGenerateResult,
  QuizInput,
  QuizStatus,
} from "@/types/quizzes";

/** Map an AI generate draft into a persistable QuizInput. */
export function quizDraftToInput(
  draft: QuizGenerateResult,
  status: QuizStatus = "draft",
): QuizInput {
  return {
    title: draft.title,
    status,
    translation_code: draft.translation,
    book: draft.book,
    start_chapter: draft.range.start.chapter,
    start_verse: draft.range.start.verse,
    end_chapter: draft.range.end.chapter,
    end_verse: draft.range.end.verse,
    generation_config: draft.generationConfig,
    questions: draft.questions,
  };
}
