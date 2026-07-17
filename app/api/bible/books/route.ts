import { NextResponse } from "next/server";

import {
  BibleLoaderError,
  fetchBooksForTranslationCode,
} from "@/lib/bible/loaders";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const translationCode = url.searchParams.get("translation");

  if (!translationCode) {
    return NextResponse.json(
      { error: "Missing required translation query parameter" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  try {
    const response = await fetchBooksForTranslationCode(
      supabase,
      translationCode,
    );
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load books";
    const status = error instanceof BibleLoaderError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
