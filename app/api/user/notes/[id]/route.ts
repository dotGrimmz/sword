import { NextResponse } from "next/server";

import { getUserIdFromRequest, unauthorizedResponse } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { sanitiseNoteBody, mapNoteRow } from "@/lib/user/notes";
import type { NoteRouteParams } from "@/types/user";

const validateUpdatePayload = (
  payload: unknown
): { body: string } | { error: string } => {
  if (payload === null || typeof payload !== "object") {
    return { error: "Payload must be an object" };
  }

  const { body } = payload as Record<string, unknown>;

  if (typeof body !== "string") {
    return { error: "Body is required" };
  }

  const trimmedBody = sanitiseNoteBody(body);

  if (trimmedBody.length === 0) {
    return { error: "Body cannot be empty" };
  }

  return { body: trimmedBody };
};

const extractNoteId = async ({
  params,
}: NoteRouteParams): Promise<string | null> => {
  const { id } = await params;
  const trimmed = id?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed;
};

export async function PATCH(request: Request, context: NoteRouteParams) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse();
  }

  const noteId = await extractNoteId(context);

  if (!noteId) {
    return NextResponse.json({ error: "Note id is required" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body must be valid JSON" },
      { status: 400 }
    );
  }

  const validation = validateUpdatePayload(payload);

  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_notes")
    .update({ body: validation.body })
    .eq("id", noteId)
    .eq("user_id", userId)
    .select(
      "id, user_id, translation_id, book_id, chapter, verse_start, verse_end, body, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const note = mapNoteRow(data);

  return NextResponse.json(note);
}

export async function DELETE(request: Request, context: NoteRouteParams) {
  const userId = getUserIdFromRequest(request);

  if (!userId) {
    return unauthorizedResponse();
  }

  const noteId = await extractNoteId(context);

  if (!noteId) {
    return NextResponse.json({ error: "Note id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
