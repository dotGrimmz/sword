import { apiFetch } from "@/lib/api/fetch";
import type {
  AdminQuizAttemptRow,
  AdminQuizScoreRow,
  AdminQuizScoresSummary,
  Quiz,
  QuizGenerateRequest,
  QuizGenerateResult,
  QuizInput,
  QuizStatus,
} from "@/types/quizzes";

export const listAdminQuizzes = (status?: QuizStatus) => {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ quizzes: Quiz[] }>(`/api/admin/quizzes${query}`);
};

export const getAdminQuiz = (id: string) =>
  apiFetch<{ quiz: Quiz }>(`/api/admin/quizzes/${id}`);

export const createAdminQuiz = (input: QuizInput) =>
  apiFetch<{ quiz: Quiz }>("/api/admin/quizzes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const updateAdminQuiz = (id: string, input: QuizInput) =>
  apiFetch<{ quiz: Quiz }>(`/api/admin/quizzes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const setAdminQuizStatus = (id: string, status: QuizStatus) =>
  apiFetch<{ quiz: Quiz }>(`/api/admin/quizzes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

export const deleteAdminQuiz = (id: string) =>
  apiFetch<{ ok: true }>(`/api/admin/quizzes/${id}`, {
    method: "DELETE",
  });

export const generateAdminQuiz = (
  input: QuizGenerateRequest | Record<string, unknown>,
) =>
  apiFetch<{ draft: QuizGenerateResult }>("/api/admin/quizzes/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const getAdminQuizScores = (id: string) =>
  apiFetch<{
    quiz: Quiz;
    scores: AdminQuizScoreRow[];
    summary: AdminQuizScoresSummary;
  }>(`/api/admin/quizzes/${id}/scores`);

export const resetAdminQuizScores = (id: string) =>
  apiFetch<{
    ok: true;
    deletedScores: number;
    deletedAttempts: number;
  }>(`/api/admin/quizzes/${id}/scores`, {
    method: "DELETE",
  });

export const getAdminQuizUserAttempts = (quizId: string, userId: string) =>
  apiFetch<{ attempts: AdminQuizAttemptRow[] }>(
    `/api/admin/quizzes/${quizId}/scores/${userId}`,
  );

export const resetAdminQuizUserAttempts = (quizId: string, userId: string) =>
  apiFetch<{ ok: true; deletedAttempts: number }>(
    `/api/admin/quizzes/${quizId}/scores/${userId}`,
    { method: "DELETE" },
  );
