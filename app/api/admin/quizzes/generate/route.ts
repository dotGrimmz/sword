import { NextResponse } from "next/server";

import {
  generateQuizFromPassage,
  normalizeGenerateRequest,
  QuizGenerateError,
} from "@/lib/ai/quiz-generate";
import { requireAdminOnly } from "@/lib/admin/auth";
import { BibleLoaderError, fetchPassageDto } from "@/lib/bible/loaders";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/quizzes/generate
 * Loads the passage, calls OpenAI, returns a draft quiz (not persisted).
 */
export async function POST(request: Request) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let generateRequest;
  try {
    generateRequest = normalizeGenerateRequest(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid generate payload";
    const status =
      error instanceof QuizGenerateError ? error.status : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const supabase = await createClient();

  try {
    const passage = await fetchPassageDto(
      supabase,
      generateRequest.translation,
      generateRequest.book,
      generateRequest.start,
      generateRequest.end,
    );

    const draft = await generateQuizFromPassage(generateRequest, passage);
    return NextResponse.json({ draft });
  } catch (error) {
    if (error instanceof BibleLoaderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof QuizGenerateError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate quiz",
      },
      { status: 500 },
    );
  }
}
