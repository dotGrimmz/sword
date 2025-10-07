import { NextResponse } from "next/server";

import { getAccessTokenFromRequest, unauthorizedResponse } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { isUuid, toOptionalInteger } from "@/lib/shared/parsers";

type BookmarkRow = {
  id: string;
  book_id: string | null;
  chapter: number | null;
  verse: number | null;
  label: string | null;
  created_at: string | null;
};

const mapBookmark = (row: BookmarkRow) => ({
  id: row.id,
  bookId: row.book_id,
  chapter: row.chapter,
  verse: row.verse,
  label: row.label,
  createdAt: row.created_at,
});

type BookmarkPayload = {
  bookId: string;
  chapter: number;
  verse: number | null | undefined;
  label: string | null | undefined;
  hasVerse: boolean;
  hasLabel: boolean;
};

const validatePayload = (payload: unknown): { data: BookmarkPayload } | { error: string } => {
  if (!payload || typeof payload !== "object") {
    return { error: "Payload must be an object" };
  }

  const source = payload as Record<string, unknown>;

  if (!Object.prototype.hasOwnProperty.call(source, "bookId")) {
    return { error: "bookId is required" };
  }

  const rawBookId = source.bookId;
  if (typeof rawBookId !== "string") {
    return { error: "bookId must be a string" };
  }

  const trimmedBookId = rawBookId.trim();

  if (!trimmedBookId) {
    return { error: "bookId cannot be empty" };
  }

  if (!isUuid(trimmedBookId)) {
    return { error: "bookId must be a UUID" };
  }

  if (!Object.prototype.hasOwnProperty.call(source, "chapter")) {
    return { error: "chapter is required" };
  }

  const parsedChapter = toOptionalInteger(source.chapter);
  if (parsedChapter === undefined || parsedChapter === null || parsedChapter < 1) {
    return { error: "chapter must be a positive integer" };
  }

  const hasVerse = Object.prototype.hasOwnProperty.call(source, "verse");
  let parsedVerse: number | null | undefined = undefined;

  if (hasVerse) {
    parsedVerse = toOptionalInteger(source.verse);

    if (parsedVerse === undefined || (parsedVerse !== null && parsedVerse < 1)) {
      return { error: "verse must be a positive integer" };
    }
  }

  const hasLabel = Object.prototype.hasOwnProperty.call(source, "label");
  let parsedLabel: string | null | undefined = undefined;

  if (hasLabel) {
    const rawLabel = source.label;

    if (rawLabel === null || rawLabel === undefined) {
      parsedLabel = null;
    } else if (typeof rawLabel === "string") {
      const trimmedLabel = rawLabel.trim();
      parsedLabel = trimmedLabel.length > 0 ? trimmedLabel : null;
    } else {
      return { error: "label must be a string" };
    }
  }

  return {
    data: {
      bookId: trimmedBookId,
      chapter: parsedChapter,
      verse: parsedVerse,
      label: parsedLabel,
      hasVerse,
      hasLabel,
    },
  };
};

const selectColumns = "id, book_id, chapter, verse, label, created_at" as const;

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
    .from("user_bookmarks")
    .select(selectColumns)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load bookmarks", message: error.message },
      { status: 500 }
    );
  }

  const bookmarks = (data ?? []).map(mapBookmark);

  return NextResponse.json(bookmarks);
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

  const {
    data: existingBookmark,
    error: fetchError,
  } = await supabase
    .from("user_bookmarks")
    .select(selectColumns)
    .eq("user_id", user.id)
    .eq("book_id", validation.data.bookId)
    .eq("chapter", validation.data.chapter)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to check existing bookmarks", message: fetchError.message },
      { status: 500 }
    );
  }

  if (existingBookmark) {
    const updates: Record<string, string | number | null> = {};
    let shouldUpdate = false;

    if (validation.data.hasLabel) {
      updates.label = validation.data.label ?? null;
      shouldUpdate = true;
    }

    if (validation.data.hasVerse) {
      updates.verse = validation.data.verse ?? null;
      shouldUpdate = true;
    }

    if (!shouldUpdate) {
      return NextResponse.json(mapBookmark(existingBookmark));
    }

    const { data, error } = await supabase
      .from("user_bookmarks")
      .update(updates)
      .eq("id", existingBookmark.id)
      .eq("user_id", user.id)
      .select(selectColumns)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update bookmark", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(mapBookmark(data));
  }

  const { data, error } = await supabase
    .from("user_bookmarks")
    .insert({
      user_id: user.id,
      book_id: validation.data.bookId,
      chapter: validation.data.chapter,
      verse: validation.data.verse ?? null,
      label: validation.data.label ?? null,
    })
    .select(selectColumns)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create bookmark", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(mapBookmark(data), { status: 201 });
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
    return NextResponse.json({ error: "Bookmark id is required" }, { status: 400 });
  }

  if (!isUuid(id)) {
    return NextResponse.json({ error: "Bookmark id must be a UUID" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete bookmark", message: error.message },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
