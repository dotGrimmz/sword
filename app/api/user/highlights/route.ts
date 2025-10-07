import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, unauthorizedResponse } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { toNullableString, toOptionalInteger } from "@/lib/shared/parsers";

const mapHighlight = (row: {
  id: string;
  book_id: string | null;
  chapter: number;
  verse_start: number;
  verse_end: number;
  color: string | null;
  created_at: string | null;
  updated_at: string | null;
}) => ({
  id: row.id,
  bookId: row.book_id,
  chapter: row.chapter,
  verseStart: row.verse_start,
  verseEnd: row.verse_end,
  color: row.color,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

type CreateHighlightPayload = {
  bookId: string | null;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  color: string | null;
};

const validatePayload = (payload: unknown): { data: CreateHighlightPayload } | { error: string } => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload must be an object" };
  }

  const { bookId, chapter, verseStart, verseEnd, color } = payload as Record<string, unknown>;

  const parsedBookId = toNullableString(bookId);
  if (parsedBookId === undefined) {
    return { error: "bookId must be a string" };
  }

  const parsedChapter = toOptionalInteger(chapter);
  if (parsedChapter === undefined || parsedChapter === null || parsedChapter < 1) {
    return { error: "chapter must be a positive integer" };
  }

  const parsedVerseStart = toOptionalInteger(verseStart);
  if (parsedVerseStart === undefined || parsedVerseStart === null || parsedVerseStart < 1) {
    return { error: "verseStart must be a positive integer" };
  }

  const parsedVerseEnd = toOptionalInteger(verseEnd);
  if (parsedVerseEnd === undefined || parsedVerseEnd === null || parsedVerseEnd < parsedVerseStart) {
    return { error: "verseEnd must be greater than or equal to verseStart" };
  }

  let parsedColor: string | null = null;
  if (typeof color === "string") {
    const trimmed = color.trim();
    parsedColor = trimmed.length > 0 ? trimmed : null;
  } else if (color === null || color === undefined) {
    parsedColor = null;
  } else {
    return { error: "color must be a string" };
  }

  return {
    data: {
      bookId: parsedBookId ?? null,
      chapter: parsedChapter,
      verseStart: parsedVerseStart,
      verseEnd: parsedVerseEnd,
      color: parsedColor,
    },
  };
};

export async function GET(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return unauthorizedResponse();
  }

  const supabase = await createClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return unauthorizedResponse();
  }

  const { data, error } = await supabase
    .from("user_highlights")
    .select("id, book_id, chapter, verse_start, verse_end, color, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load highlights", message: error.message },
      { status: 500 }
    );
  }

  const highlights = (data ?? []).map(mapHighlight);

  return NextResponse.json(highlights);
}

export async function POST(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return unauthorizedResponse();
  }

  const supabase = await createClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return unauthorizedResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const validation = validatePayload(payload);

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_highlights")
    .insert({
      user_id: user.id,
      book_id: validation.data.bookId,
      chapter: validation.data.chapter,
      verse_start: validation.data.verseStart,
      verse_end: validation.data.verseEnd,
      color: validation.data.color,
    })
    .select("id, book_id, chapter, verse_start, verse_end, color, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create highlight", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(mapHighlight(data), { status: 201 });
}

export async function DELETE(request: Request) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return unauthorizedResponse();
  }

  const supabase = await createClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Highlight id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_highlights")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete highlight", message: error.message },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Highlight not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
