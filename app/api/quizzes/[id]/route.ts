import { NextResponse } from "next/server";

import { getPublishedQuizForTake } from "@/lib/quizzes/member-loaders";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const accessTokenFromRequest = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
};

export async function GET(
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

  try {
    const admin = getServiceRoleClient();
    const quiz = await getPublishedQuizForTake(admin, id);
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
