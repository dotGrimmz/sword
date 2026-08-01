import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  deleteQuiz,
  getAdminQuiz,
  updateQuiz,
  updateQuizStatus,
} from "@/lib/quizzes/loaders";
import { normalizeQuizInput } from "@/lib/quizzes/normalize";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import type { QuizStatus } from "@/types/quizzes";

const STATUSES: QuizStatus[] = ["draft", "published", "archived"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Quiz id is required" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  try {
    const quiz = await getAdminQuiz(supabase, id);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    return NextResponse.json({ quiz });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load quiz",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Quiz id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  try {
    const input = normalizeQuizInput(body);
    const quiz = await updateQuiz(supabase, id, input);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update quiz";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Quiz id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status;
  if (typeof status !== "string" || !STATUSES.includes(status as QuizStatus)) {
    return NextResponse.json(
      { error: "status must be draft, published, or archived" },
      { status: 400 },
    );
  }

  const supabase = getServiceRoleClient();
  try {
    const quiz = await updateQuizStatus(supabase, id, status as QuizStatus);
    return NextResponse.json({ quiz });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update quiz status";
    const responseStatus = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status: responseStatus });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Quiz id is required" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  try {
    await deleteQuiz(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete quiz";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
