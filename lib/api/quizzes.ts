import { apiFetch } from "@/lib/api/fetch";
import type {
  PublicQuizDetail,
  PublicQuizSummary,
  QuizAttemptAnswer,
  QuizAttemptResult,
} from "@/types/quizzes";

export const listPublishedQuizzes = () =>
  apiFetch<{ quizzes: PublicQuizSummary[] }>("/api/quizzes");

export const getPublishedQuiz = (id: string) =>
  apiFetch<{ quiz: PublicQuizDetail }>(`/api/quizzes/${id}`);

export const submitQuizAttempt = (id: string, answers: QuizAttemptAnswer[]) =>
  apiFetch<{ attempt: QuizAttemptResult }>(`/api/quizzes/${id}/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
