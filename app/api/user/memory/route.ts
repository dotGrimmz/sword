import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, unauthorizedResponse } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { isUuid, toOptionalInteger } from "@/lib/shared/parsers";

type MemoryVerseRow = Pick<
  Database["public"]["Tables"]["user_memory_verses"]["Row"],
  | "id"
  | "book_id"
  | "chapter"
  | "verse_start"
  | "verse_end"
  | "ease"
  | "interval_days"
  | "next_review_date"
  | "created_at"
  | "updated_at"
>;

const mapMemoryVerse = (row: MemoryVerseRow) => ({
  id: row.id,
  bookId: row.book_id,
  chapter: row.chapter,
  verseStart: row.verse_start,
  verseEnd: row.verse_end,
  ease: row.ease,
  intervalDays: row.interval_days,
  nextReviewDate: row.next_review_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  label: null as string | null,
  tags: null as string[] | null,
});

type MemoryVersePayload = {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  label: string | null;
  tags: string[] | null;
};

const validatePayload = (payload: unknown): { data: MemoryVersePayload } | { error: string } => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload must be an object" };
  }

  const source = payload as Record<string, unknown>;

  const rawBookId = source.bookId;
  if (typeof rawBookId !== "string" || rawBookId.trim().length === 0) {
    return { error: "bookId must be a non-empty string" };
  }

  const bookId = rawBookId.trim();
  if (!isUuid(bookId)) {
    return { error: "bookId must be a UUID" };
  }

  const parsedChapter = toOptionalInteger(source.chapter);
  if (parsedChapter === undefined || parsedChapter === null || parsedChapter < 1) {
    return { error: "chapter must be a positive integer" };
  }

  const parsedVerseStart = toOptionalInteger(source.verseStart);
  if (parsedVerseStart === undefined || parsedVerseStart === null || parsedVerseStart < 1) {
    return { error: "verseStart must be a positive integer" };
  }

  const hasVerseEnd = Object.prototype.hasOwnProperty.call(source, "verseEnd");
  const parsedVerseEndValue = toOptionalInteger(source.verseEnd);
  let parsedVerseEnd: number;
  if (!hasVerseEnd || parsedVerseEndValue === null) {
    parsedVerseEnd = parsedVerseStart;
  } else {
    if (parsedVerseEndValue === undefined || parsedVerseEndValue < parsedVerseStart) {
      return { error: "verseEnd must be greater than or equal to verseStart" };
    }
    parsedVerseEnd = parsedVerseEndValue;
  }

  let label: string | null = null;
  if (Object.prototype.hasOwnProperty.call(source, "label")) {
    const rawLabel = source.label;
    if (rawLabel === null || rawLabel === undefined) {
      label = null;
    } else if (typeof rawLabel === "string") {
      const trimmed = rawLabel.trim();
      label = trimmed.length > 0 ? trimmed : null;
    } else {
      return { error: "label must be a string" };
    }
  }

  let tags: string[] | null = null;
  if (Object.prototype.hasOwnProperty.call(source, "tags")) {
    const rawTags = source.tags;
    if (rawTags === null || rawTags === undefined) {
      tags = null;
    } else if (Array.isArray(rawTags)) {
      const cleaned = rawTags
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0);

      tags = cleaned.length > 0 ? Array.from(new Set(cleaned)) : null;
    } else {
      return { error: "tags must be an array of strings" };
    }
  }

  return {
    data: {
      bookId,
      chapter: parsedChapter,
      verseStart: parsedVerseStart,
      verseEnd: parsedVerseEnd,
      label,
      tags,
    },
  };
};

const selectColumns =
  "id, book_id, chapter, verse_start, verse_end, ease, interval_days, next_review_date, created_at, updated_at" as const;

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
    .from("user_memory_verses")
    .select(selectColumns)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load memory verses", message: error.message },
      { status: 500 }
    );
  }

  const verses = (data ?? []).map(mapMemoryVerse);

  return NextResponse.json(verses);
}

export async function POST(request: Request) {
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
    .from("user_memory_verses")
    .insert({
      user_id: user.id,
      book_id: validation.data.bookId,
      chapter: validation.data.chapter,
      verse_start: validation.data.verseStart,
      verse_end: validation.data.verseEnd,
    })
    .select(selectColumns)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Failed to create memory verse", message: error?.message ?? "" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ...mapMemoryVerse(data),
      label: validation.data.label,
      tags: validation.data.tags,
    },
    {
      status: 201,
    }
  );
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
    return NextResponse.json({ error: "Memory verse id is required" }, { status: 400 });
  }

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Memory verse id must be a UUID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_memory_verses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete memory verse", message: error.message },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Memory verse not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
