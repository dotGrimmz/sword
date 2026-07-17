import { NextResponse } from "next/server";

import { BibleLoaderError, fetchChapterDto } from "@/lib/bible/loaders";
import { parsePositiveInteger } from "@/lib/bible/utils";
import { createClient } from "@/lib/supabase/server";
import type { ChapterRouteParams } from "@/types/bible";

export async function GET(request: Request, { params }: ChapterRouteParams) {
  const routeParams = await params;

  const url = new URL(request.url);
  const translationCode = url.searchParams.get("translation");

  if (!translationCode) {
    return NextResponse.json(
      { error: "Missing required translation query parameter" },
      { status: 400 },
    );
  }

  const chapterNumber = parsePositiveInteger(routeParams.chapter);

  if (chapterNumber === null) {
    return NextResponse.json(
      { error: "Chapter must be a positive integer" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  try {
    const response = await fetchChapterDto(
      supabase,
      translationCode,
      routeParams.book,
      chapterNumber,
    );
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load chapter";
    const status = error instanceof BibleLoaderError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
