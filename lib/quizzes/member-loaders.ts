import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeQuizRow } from "@/lib/quizzes/normalize";
import { scoreQuizAttempt } from "@/lib/quizzes/score";
import { toPublicQuizDetail, toPublicQuizSummary } from "@/lib/quizzes/strip";
import type {
  PublicQuizDetail,
  PublicQuizSummary,
  Quiz,
  QuizAttemptAnswer,
  QuizAttemptProgress,
  QuizAttemptResult,
} from "@/types/quizzes";
import { ATTEMPT_LIMIT_REACHED_MESSAGE } from "@/types/quizzes";

type Client = SupabaseClient;

const QUIZ_SELECT = `
  id, title, status, translation_code, book,
  start_chapter, start_verse, end_chapter, end_verse,
  generation_config, questions, question_count, max_attempts,
  created_by, created_at, updated_at
`;

const QUIZ_SUMMARY_SELECT = `
  id, title, translation_code, book,
  start_chapter, start_verse, end_chapter, end_verse,
  question_count, max_attempts, updated_at
`;

const SCORE_SELECT = `
  best_score, max_score, best_percent, attempt_count,
  best_attempt_id, finalized_at
`;

type ScoreRow = {
  best_score: number;
  max_score: number;
  best_percent: number | string;
  attempt_count: number;
  best_attempt_id: string | null;
  finalized_at: string | null;
};

function toPercent(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 10000) / 100;
}

function progressFromScore(
  maxAttempts: number,
  row: ScoreRow | null,
): QuizAttemptProgress {
  if (!row) {
    return {
      attemptCount: 0,
      maxAttempts,
      attemptsRemaining: maxAttempts,
      bestScore: null,
      bestMaxScore: null,
      bestPercent: null,
      finalized: false,
      bestAttemptId: null,
    };
  }

  const attemptCount = Number(row.attempt_count) || 0;
  const finalized =
    Boolean(row.finalized_at) || attemptCount >= maxAttempts;
  const attemptsRemaining = Math.max(0, maxAttempts - attemptCount);

  return {
    attemptCount,
    maxAttempts,
    attemptsRemaining: finalized ? 0 : attemptsRemaining,
    bestScore: Number(row.best_score),
    bestMaxScore: Number(row.max_score),
    bestPercent: Number(row.best_percent),
    finalized,
    bestAttemptId: row.best_attempt_id,
  };
}

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

async function getScoreRow(
  client: Client,
  quizId: string,
  userId: string,
): Promise<ScoreRow | null> {
  const { data, error } = await client
    .from("quiz_scores")
    .select(SCORE_SELECT)
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as ScoreRow;
}

export async function getQuizAttemptProgress(
  client: Client,
  quizId: string,
  userId: string,
  maxAttempts: number,
): Promise<QuizAttemptProgress> {
  const row = await getScoreRow(client, quizId, userId);
  return progressFromScore(maxAttempts, row);
}

export async function listPublishedQuizzes(
  client: Client,
  userId?: string,
): Promise<PublicQuizSummary[]> {
  const { data, error } = await client
    .from("quizzes")
    .select(QUIZ_SUMMARY_SELECT)
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const quizzes = (data ?? []).map((row) => {
    const normalized = normalizeQuizRow({
      ...(row as Record<string, unknown>),
      status: "published",
      generation_config: {},
      questions: [],
      created_by: null,
      created_at: "",
    });
    return toPublicQuizSummary(normalized);
  });

  if (!userId || quizzes.length === 0) {
    return quizzes;
  }

  const quizIds = quizzes.map((q) => q.id);
  const { data: scores, error: scoresError } = await client
    .from("quiz_scores")
    .select(`quiz_id, ${SCORE_SELECT}`)
    .eq("user_id", userId)
    .in("quiz_id", quizIds);

  if (scoresError) throw new Error(scoresError.message);

  const byQuiz = new Map<string, ScoreRow>();
  for (const row of scores ?? []) {
    const r = row as ScoreRow & { quiz_id: string };
    byQuiz.set(String(r.quiz_id), r);
  }

  return quizzes.map((quiz) => ({
    ...quiz,
    progress: progressFromScore(
      quiz.max_attempts,
      byQuiz.get(quiz.id) ?? null,
    ),
  }));
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

function answersFromStoredPayload(
  payload: unknown,
): QuizAttemptAnswer[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const questionId =
        typeof row.questionId === "string"
          ? row.questionId
          : typeof row.question_id === "string"
            ? row.question_id
            : "";
      if (!questionId) return null;
      const value =
        typeof row.value === "string"
          ? row.value
          : typeof row.answer === "string"
            ? row.answer
            : "";
      return { questionId, value };
    })
    .filter((item): item is QuizAttemptAnswer => item !== null);
}

/** Rebuild graded review for the member's best attempt (locked state). */
export async function getBestAttemptResult(
  client: Client,
  params: {
    quizId: string;
    userId: string;
  },
): Promise<QuizAttemptResult | null> {
  const quiz = await getPublishedQuiz(client, params.quizId);
  if (!quiz) return null;

  const scoreRow = await getScoreRow(client, params.quizId, params.userId);
  if (!scoreRow?.best_attempt_id) return null;

  const progress = progressFromScore(quiz.max_attempts, scoreRow);

  const { data: attempt, error } = await client
    .from("quiz_attempts")
    .select("id, score, max_score, answers")
    .eq("id", scoreRow.best_attempt_id)
    .eq("quiz_id", params.quizId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!attempt) return null;

  const answers = answersFromStoredPayload(
    (attempt as { answers: unknown }).answers,
  );
  const { score, maxScore, results } = scoreQuizAttempt(quiz, answers);

  return {
    attemptId: String((attempt as { id: string }).id),
    quizId: quiz.id,
    score,
    maxScore,
    results,
    attemptNumber: progress.attemptCount,
    maxAttempts: progress.maxAttempts,
    attemptsRemaining: progress.attemptsRemaining,
    bestScore: progress.bestScore ?? score,
    bestMaxScore: progress.bestMaxScore ?? maxScore,
    bestPercent: progress.bestPercent ?? toPercent(score, maxScore),
    finalized: progress.finalized,
  };
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

  const existing = await getScoreRow(client, quiz.id, params.userId);
  const priorProgress = progressFromScore(quiz.max_attempts, existing);
  if (priorProgress.finalized || priorProgress.attemptsRemaining <= 0) {
    throw new Error(ATTEMPT_LIMIT_REACHED_MESSAGE);
  }

  const { score, maxScore, results, answersPayload } = scoreQuizAttempt(
    quiz,
    params.answers,
  );
  const percent = toPercent(score, maxScore);
  const now = new Date().toISOString();

  const { data: attemptRow, error: attemptError } = await client
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

  if (attemptError) throw new Error(attemptError.message);

  const attemptId = String((attemptRow as { id: string }).id);
  const nextAttemptCount = priorProgress.attemptCount + 1;
  const improved =
    existing == null || score > Number(existing.best_score);
  const finalized = nextAttemptCount >= quiz.max_attempts;

  if (!existing) {
    const { error: insertScoreError } = await client
      .from("quiz_scores")
      .insert({
        quiz_id: quiz.id,
        user_id: params.userId,
        best_score: score,
        max_score: maxScore,
        best_percent: percent,
        attempt_count: 1,
        best_attempt_id: attemptId,
        first_completed_at: now,
        best_achieved_at: now,
        finalized_at: finalized ? now : null,
        created_at: now,
        updated_at: now,
      } as never);

    if (insertScoreError) throw new Error(insertScoreError.message);
  } else {
    const { error: updateScoreError } = await client
      .from("quiz_scores")
      .update({
        attempt_count: nextAttemptCount,
        ...(improved
          ? {
              best_score: score,
              max_score: maxScore,
              best_percent: percent,
              best_attempt_id: attemptId,
              best_achieved_at: now,
            }
          : {}),
        finalized_at: finalized ? (existing.finalized_at ?? now) : null,
        updated_at: now,
      } as never)
      .eq("quiz_id", quiz.id)
      .eq("user_id", params.userId);

    if (updateScoreError) throw new Error(updateScoreError.message);
  }

  const bestScore = improved
    ? score
    : (priorProgress.bestScore ?? score);
  const bestMaxScore = improved
    ? maxScore
    : (priorProgress.bestMaxScore ?? maxScore);
  const bestPercent = improved
    ? percent
    : (priorProgress.bestPercent ?? percent);

  return {
    attemptId,
    quizId: quiz.id,
    score,
    maxScore,
    results,
    attemptNumber: nextAttemptCount,
    maxAttempts: quiz.max_attempts,
    attemptsRemaining: Math.max(0, quiz.max_attempts - nextAttemptCount),
    bestScore,
    bestMaxScore,
    bestPercent,
    finalized,
  };
}
