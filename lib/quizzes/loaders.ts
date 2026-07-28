import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeQuizRow,
  quizInputToRow,
} from "@/lib/quizzes/normalize";
import type { Quiz, QuizInput, QuizStatus } from "@/types/quizzes";

type Client = SupabaseClient;

const QUIZ_SELECT = `
  id, title, status, translation_code, book,
  start_chapter, start_verse, end_chapter, end_verse,
  generation_config, questions, question_count,
  created_by, created_at, updated_at
`;

export async function listAdminQuizzes(
  client: Client,
  options?: { status?: QuizStatus },
): Promise<Quiz[]> {
  let query = client
    .from("quizzes")
    .select(QUIZ_SELECT)
    .order("created_at", { ascending: false });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) =>
    normalizeQuizRow(row as Record<string, unknown>),
  );
}

export async function getAdminQuiz(
  client: Client,
  id: string,
): Promise<Quiz | null> {
  const { data, error } = await client
    .from("quizzes")
    .select(QUIZ_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeQuizRow(data as Record<string, unknown>);
}

export async function createQuiz(
  client: Client,
  input: QuizInput,
  createdBy: string,
): Promise<Quiz> {
  const row = quizInputToRow(input, createdBy);

  const { data, error } = await client
    .from("quizzes")
    .insert(row as never)
    .select(QUIZ_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return normalizeQuizRow(data as Record<string, unknown>);
}

export async function updateQuiz(
  client: Client,
  id: string,
  input: QuizInput,
): Promise<Quiz> {
  const row = quizInputToRow(input);

  const { data, error } = await client
    .from("quizzes")
    .update(row as never)
    .eq("id", id)
    .select(QUIZ_SELECT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Quiz not found");
  return normalizeQuizRow(data as Record<string, unknown>);
}

export async function deleteQuiz(client: Client, id: string): Promise<void> {
  const { data, error } = await client
    .from("quizzes")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Quiz not found");
}
