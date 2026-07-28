import { apiFetch } from "@/lib/api/fetch";
import type {
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
