import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminQuiz } from "@/lib/quizzes/loaders";
import type {
  AdminQuizAttemptAnswer,
  AdminQuizAttemptRow,
  AdminQuizScoreRow,
  AdminQuizScoresSummary,
  Quiz,
  QuizQuestion,
} from "@/types/quizzes";

type Client = SupabaseClient;

type ScoreDbRow = {
  user_id: string;
  best_score: number;
  max_score: number;
  best_percent: number | string;
  attempt_count: number;
  best_attempt_id: string | null;
  first_completed_at: string;
  best_achieved_at: string;
  finalized_at: string | null;
};

type ProfileDbRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  title: string | null;
  role: string | null;
};

type AttemptDbRow = {
  id: string;
  score: number | null;
  max_score: number | null;
  answers: unknown;
  completed_at: string | null;
  created_at: string;
};

const parseStoredAnswers = (
  payload: unknown,
  questionsById: Map<string, QuizQuestion>,
): AdminQuizAttemptAnswer[] => {
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

      const question = questionsById.get(questionId);
      const value =
        typeof row.value === "string"
          ? row.value
          : typeof row.answer === "string"
            ? row.answer
            : "";
      const correct = Boolean(row.correct);

      return {
        questionId,
        prompt: question?.prompt ?? `Question ${questionId}`,
        value,
        correct,
        correctAnswer: question?.correctAnswer ?? null,
      };
    })
    .filter((item): item is AdminQuizAttemptAnswer => item !== null);
};

async function resolveEmails(
  client: Client,
  userIds: string[],
): Promise<Map<string, string | null>> {
  const emails = new Map<string, string | null>();
  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data, error } = await client.auth.admin.getUserById(userId);
        if (error || !data.user) {
          emails.set(userId, null);
          return;
        }
        emails.set(userId, data.user.email ?? null);
      } catch {
        emails.set(userId, null);
      }
    }),
  );
  return emails;
}

export function summarizeAdminQuizScores(
  scores: AdminQuizScoreRow[],
): AdminQuizScoresSummary {
  if (scores.length === 0) {
    return {
      memberCount: 0,
      finalizedCount: 0,
      averageBestPercent: null,
    };
  }

  const finalizedCount = scores.filter((row) => row.finalized).length;
  const avg =
    scores.reduce((sum, row) => sum + row.bestPercent, 0) / scores.length;

  return {
    memberCount: scores.length,
    finalizedCount,
    averageBestPercent: Math.round(avg * 10) / 10,
  };
}

export async function listAdminQuizScores(
  client: Client,
  quizId: string,
): Promise<{ quiz: Quiz; scores: AdminQuizScoreRow[] } | null> {
  const quiz = await getAdminQuiz(client, quizId);
  if (!quiz) return null;

  const { data, error } = await client
    .from("quiz_scores")
    .select(
      `
      user_id,
      best_score,
      max_score,
      best_percent,
      attempt_count,
      best_attempt_id,
      first_completed_at,
      best_achieved_at,
      finalized_at
    `,
    )
    .eq("quiz_id", quizId)
    .order("best_score", { ascending: false })
    .order("best_achieved_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ScoreDbRow[];
  const userIds = rows.map((row) => row.user_id);

  const profileById = new Map<string, ProfileDbRow>();
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await client
      .from("profiles")
      .select("id, username, avatar_url, title, role")
      .in("id", userIds);

    if (profilesError) throw new Error(profilesError.message);

    for (const profile of (profiles ?? []) as ProfileDbRow[]) {
      profileById.set(profile.id, profile);
    }
  }

  const emailMap = await resolveEmails(client, userIds);

  const scores: AdminQuizScoreRow[] = rows.map((row) => {
    const profile = profileById.get(row.user_id);
    const username = profile?.username?.trim() || null;
    const email = emailMap.get(row.user_id) ?? null;
    const displayName = username || email || "Member";

    return {
      userId: row.user_id,
      username,
      email,
      displayName,
      avatarUrl: profile?.avatar_url ?? null,
      title: profile?.title ?? null,
      role: profile?.role ?? "user",
      bestScore: Number(row.best_score) || 0,
      maxScore: Number(row.max_score) || 0,
      bestPercent: Number(row.best_percent) || 0,
      attemptCount: Number(row.attempt_count) || 0,
      maxAttempts: quiz.max_attempts,
      finalized: Boolean(row.finalized_at),
      bestAttemptId: row.best_attempt_id,
      firstCompletedAt: row.first_completed_at,
      bestAchievedAt: row.best_achieved_at,
    };
  });

  return { quiz, scores };
}

export async function listAdminQuizAttemptsForUser(
  client: Client,
  quizId: string,
  userId: string,
): Promise<AdminQuizAttemptRow[] | null> {
  const quiz = await getAdminQuiz(client, quizId);
  if (!quiz) return null;

  const { data: scoreRow, error: scoreError } = await client
    .from("quiz_scores")
    .select("best_attempt_id")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .maybeSingle();

  if (scoreError) throw new Error(scoreError.message);

  const { data, error } = await client
    .from("quiz_attempts")
    .select("id, score, max_score, answers, completed_at, created_at")
    .eq("quiz_id", quizId)
    .eq("user_id", userId)
    .order("completed_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const bestAttemptId =
    (scoreRow as { best_attempt_id: string | null } | null)?.best_attempt_id ??
    null;
  const questionsById = new Map(
    quiz.questions.map((question) => [question.id, question]),
  );

  return ((data ?? []) as AttemptDbRow[]).map((row) => ({
    attemptId: row.id,
    score: Number(row.score) || 0,
    maxScore: Number(row.max_score) || quiz.question_count,
    completedAt: row.completed_at ?? row.created_at,
    isBest: Boolean(bestAttemptId && row.id === bestAttemptId),
    answers: parseStoredAnswers(row.answers, questionsById),
  }));
}
