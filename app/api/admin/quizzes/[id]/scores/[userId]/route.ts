import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import { listAdminQuizAttemptsForUser } from "@/lib/quizzes/admin-scores";
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
