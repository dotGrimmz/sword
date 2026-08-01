import { NextResponse } from "next/server";

import { listPublishedQuizzes } from "@/lib/quizzes/member-loaders";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const accessTokenFromRequest = (request: Request) => {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
};

export async function GET(request: Request) {
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
    const quizzes = await listPublishedQuizzes(admin);
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
