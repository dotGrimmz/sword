import { NextResponse } from "next/server";

import { createQuizAttempt } from "@/lib/quizzes/member-loaders";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { QuizAttemptAnswer } from "@/types/quizzes";

const accessTokenFromRequest = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
};

const parseAnswers = (body: unknown): QuizAttemptAnswer[] => {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid body");
  }
  const answers = (body as { answers?: unknown }).answers;
  if (!Array.isArray(answers)) {
    throw new Error("answers must be an array");
  }

  return answers.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`answers[${index}] is invalid`);
    }
    const row = item as Record<string, unknown>;
    const questionId =
      typeof row.questionId === "string"
        ? row.questionId
        : typeof row.question_id === "string"
          ? row.question_id
          : "";
    if (!questionId.trim()) {
      throw new Error(`answers[${index}].questionId is required`);
    }
    const value =
      typeof row.value === "string"
        ? row.value
        : typeof row.answer === "string"
          ? row.answer
          : "";
    return { questionId: questionId.trim(), value };
  });
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient(accessTokenFromRequest(request));

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let answers: QuizAttemptAnswer[];
  try {
    const body = await request.json();
    answers = parseAnswers(body);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Invalid request body",
      },
      { status: 400 },
    );
  }

  try {
    const admin = getServiceRoleClient();
    const result = await createQuizAttempt(admin, {
      quizId: id,
      userId: user.id,
      answers,
    });
    return NextResponse.json({ attempt: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit quiz";
    const status = message === "Quiz not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
