import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  listAdminQuizScores,
  summarizeAdminQuizScores,
} from "@/lib/quizzes/admin-scores";
import { getServiceRoleClient } from "@/lib/supabase/admin";

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

  try {
    const admin = getServiceRoleClient();
    const result = await listAdminQuizScores(admin, id);
    if (!result) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({
      quiz: result.quiz,
      scores: result.scores,
      summary: summarizeAdminQuizScores(result.scores),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load quiz scores",
      },
      { status: 500 },
    );
  }
}
