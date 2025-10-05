import { NextResponse } from "next/server";

import { getUserIdFromRequest, unauthorizedResponse } from "@/lib/auth/context";
import { parseLimitParam } from "@/lib/bible/utils";
import { createClient } from "@/lib/supabase/server";
import { toNullableString, toOptionalInteger } from "@/lib/shared/parsers";
import { mapNoteRow, sanitiseNoteBody } from "@/lib/user/notes";
import type { CreateUserNotePayload } from "@/types/user";

const validateCreatePayload = (
  payload: unknown
): { data: CreateUserNotePayload } | { error: string } => {
  if (payload === null || typeof payload !== "object") {
    return { error: "Payload must be an object" };
  }

  const { translationId, bookId, chapter, verseStart, verseEnd, body } =
    payload as Record<string, unknown>;

  if (typeof body !== "string") {
    return { error: "Body is required" };
  }

  const trimmedBody = sanitiseNoteBody(body);

  if (trimmedBody.length === 0) {
    return { error: "Body cannot be empty" };
  }

  const parsedTranslationId = toNullableString(translationId);
  if (parsedTranslationId === undefined) {
    return { error: "translationId must be a string" };
  }

  const parsedBookId = toNullableString(bookId);
  if (parsedBookId === undefined) {
    return { error: "bookId must be a string" };
  }

  const parsedChapter = toOptionalInteger(chapter);
  if (
    parsedChapter === undefined ||
    (parsedChapter !== null && parsedChapter < 1)
  ) {
    return { error: "chapter must be a positive integer" };
  }

  const parsedVerseStart = toOptionalInteger(verseStart);
  if (
    parsedVerseStart === undefined ||
    (parsedVerseStart !== null && parsedVerseStart < 1)
  ) {
    return { error: "verseStart must be a positive integer" };
  }

  const parsedVerseEnd = toOptionalInteger(verseEnd);
  if (
    parsedVerseEnd === undefined ||
    (parsedVerseEnd !== null && parsedVerseEnd < 1)
  ) {
    return { error: "verseEnd must be a positive integer" };
  }

  if (
    parsedVerseStart !== null &&
    parsedVerseEnd !== null &&
    parsedVerseEnd < parsedVerseStart
  ) {
    return { error: "verseEnd must be greater than or equal to verseStart" };
  }

  return {
    data: {
      translationId: parsedTranslationId ?? null,
      bookId: parsedBookId ?? null,
      chapter: parsedChapter ?? null,
      verseStart: parsedVerseStart ?? null,
      verseEnd: parsedVerseEnd ?? null,
      body: trimmedBody,
    },
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = parseLimitParam(limitParam, 100, 250);

  if (limit === null) {
    return NextResponse.json(
      { error: "Limit must be a positive integer" },
      { status: 400 }
    );
  }

  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_notes")
    .select(
      "id, user_id, translation_id, book_id, chapter, verse_start, verse_end, body, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load notes" },
      { status: 500 }
    );
  }

  const notes = (data ?? []).map(mapNoteRow);

  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body must be valid JSON" },
      { status: 400 }
    );
  }

  const validation = validateCreatePayload(payload);

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_notes")
    .insert({
      user_id: userId,
      translation_id: validation.data.translationId,
      book_id: validation.data.bookId,
      chapter: validation.data.chapter,
      verse_start: validation.data.verseStart,
      verse_end: validation.data.verseEnd,
      body: validation.data.body,
    })
    .select(
      "id, user_id, translation_id, book_id, chapter, verse_start, verse_end, body, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: `Failed to create note because ${error.cause || error.message}`,
      },
      { status: 500 }
    );
  }

  const note = mapNoteRow(data);

  return NextResponse.json(note, { status: 201 });
}
