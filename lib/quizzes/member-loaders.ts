import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeQuizRow } from "@/lib/quizzes/normalize";
import { toPublicQuizDetail } from "@/lib/quizzes/strip";
import { scoreQuizAttempt } from "@/lib/quizzes/score";
import type {
  PublicQuizDetail,
  PublicQuizSummary,
  Quiz,
  QuizAttemptAnswer,
  QuizAttemptResult,
} from "@/types/quizzes";

type Client = SupabaseClient;

const QUIZ_SELECT = `
  id, title, status, translation_code, book,
  start_chapter, start_verse, end_chapter, end_verse,
  generation_config, questions, question_count,
  created_by, created_at, updated_at
`;

const QUIZ_SUMMARY_SELECT = `
  id, title, translation_code, book,
  start_chapter, start_verse, end_chapter, end_verse,
  question_count, updated_at
`;

async function getPublishedQuiz(
  client: Client,
  id: string,
): Promise<Quiz | null> {
  const { data, error } = await client
    .from("quizzes")
    .select(QUIZ_SELECT)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeQuizRow(data as Record<string, unknown>);
}

export async function listPublishedQuizzes(
  client: Client,
): Promise<PublicQuizSummary[]> {
  const { data, error } = await client
    .from("quizzes")
    .select(QUIZ_SUMMARY_SELECT)
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      title: String(r.title ?? ""),
      translation_code: String(r.translation_code ?? "WEB"),
      book: String(r.book ?? ""),
      start_chapter: Number(r.start_chapter ?? 1) || 1,
      start_verse: Number(r.start_verse ?? 1) || 1,
      end_chapter: Number(r.end_chapter ?? 1) || 1,
      end_verse: Number(r.end_verse ?? 1) || 1,
      question_count: Number(r.question_count ?? 0) || 0,
      updated_at: String(r.updated_at ?? ""),
    };
  });
}

export async function getPublishedQuizForTake(
  client: Client,
  id: string,
): Promise<PublicQuizDetail | null> {
  const quiz = await getPublishedQuiz(client, id);
  if (!quiz) return null;
  if (quiz.questions.length === 0) return null;
  return toPublicQuizDetail(quiz);
}

export async function createQuizAttempt(
  client: Client,
  params: {
    quizId: string;
    userId: string;
    answers: QuizAttemptAnswer[];
  },
): Promise<QuizAttemptResult> {
  const quiz = await getPublishedQuiz(client, params.quizId);
  if (!quiz) {
    throw new Error("Quiz not found");
  }
  if (quiz.questions.length === 0) {
    throw new Error("Quiz has no questions");
  }

  const { score, maxScore, results, answersPayload } = scoreQuizAttempt(
    quiz,
    params.answers,
  );

  const now = new Date().toISOString();
  const { data, error } = await client
    .from("quiz_attempts")
    .insert({
      quiz_id: quiz.id,
      user_id: params.userId,
      assignment_id: null,
      score,
      max_score: maxScore,
      answers: answersPayload,
      started_at: now,
      completed_at: now,
      updated_at: now,
    } as never)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  return {
    attemptId: String((data as { id: string }).id),
    quizId: quiz.id,
    score,
    maxScore,
    results,
  };
}
