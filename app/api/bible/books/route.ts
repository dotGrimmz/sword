import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchBooksForTranslation,
  fetchTranslationByCode,
} from "@/lib/bible/queries";
import type { BibleBookSummary, BibleBooksResponse } from "@/types/bible";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const translationCode = url.searchParams.get("translation");

  if (!translationCode) {
    return NextResponse.json(
      { error: "Missing required translation query parameter" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: translation,
    error: translationError,
  } = await fetchTranslationByCode(supabase, translationCode);

  if (translationError) {
    return NextResponse.json(
      { error: "Failed to look up translation" },
      { status: 500 }
    );
  }

  if (!translation) {
    return NextResponse.json(
      { error: "Translation not found" },
      { status: 404 }
    );
  }

  const { data: books, error: booksError } = await fetchBooksForTranslation(
    supabase,
    translation.id
  );

  if (booksError) {
    return NextResponse.json(
      { error: "Failed to load books" },
      { status: 500 }
    );
  }

  const booksPayload = ((books ?? []) as {
    id: string;
    name: string;
    abbreviation: string | null;
    chapters: number;
    order_index: number;
  }[]).map<BibleBookSummary>((book) => ({
    id: book.id,
    name: book.name,
    abbreviation: book.abbreviation,
    chapters: book.chapters,
    order: book.order_index,
  }));

  const response: BibleBooksResponse = {
    translation: {
      code: translation.code,
      name: translation.name,
    },
    books: booksPayload,
  };

  return NextResponse.json(response);
}
