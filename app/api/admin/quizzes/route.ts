import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  createQuiz,
  listAdminQuizzes,
} from "@/lib/quizzes/loaders";
import { normalizeQuizInput } from "@/lib/quizzes/normalize";
import { createClient } from "@/lib/supabase/server";
import type { QuizStatus } from "@/types/quizzes";

const STATUSES: QuizStatus[] = ["draft", "published", "archived"];

export async function GET(request: Request) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && STATUSES.includes(statusParam as QuizStatus)
      ? (statusParam as QuizStatus)
      : undefined;

  const supabase = await createClient();
  try {
    const quizzes = await listAdminQuizzes(supabase, { status });
    return NextResponse.json({ quizzes });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load quizzes",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const input = normalizeQuizInput(body);
    const quiz = await createQuiz(supabase, input, auth.user.id);
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create quiz",
      },
      { status: 400 },
    );
  }
}
