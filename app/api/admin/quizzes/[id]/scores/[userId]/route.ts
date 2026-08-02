import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  listAdminQuizAttemptsForUser,
  resetAdminQuizScoresForUser,
} from "@/lib/quizzes/admin-scores";
import { getServiceRoleClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly(request);
  if (auth.error) return auth.error;

  const { id, userId } = await context.params;
  if (!id || !userId) {
    return NextResponse.json(
      { error: "Quiz id and user id are required" },
      { status: 400 },
    );
  }

  try {
    const admin = getServiceRoleClient();
    const attempts = await listAdminQuizAttemptsForUser(admin, id, userId);
    if (attempts === null) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({ attempts });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load quiz attempts",
      },
      { status: 500 },
    );
  }
}

/** DELETE — reset one member's attempts/scores for this quiz. */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly(request);
  if (auth.error) return auth.error;

  const { id, userId } = await context.params;
  if (!id || !userId) {
    return NextResponse.json(
      { error: "Quiz id and user id are required" },
      { status: 400 },
    );
  }

  try {
    const admin = getServiceRoleClient();
    const result = await resetAdminQuizScoresForUser(admin, id, userId);
    if (!result) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true as const,
      deletedAttempts: result.deletedAttempts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reset member attempts",
      },
      { status: 500 },
    );
  }
}
