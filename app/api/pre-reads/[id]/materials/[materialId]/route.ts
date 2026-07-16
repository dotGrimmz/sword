import { NextResponse } from "next/server";

import {
  deleteMaterial,
  normalizeStudyMaterial,
} from "@/lib/study/materials/strategy";
import { createClient } from "@/lib/supabase/server";

import { errorStatusFromCode, requireAdmin } from "../../../utils";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; materialId: string }> },
) {
  const { id, materialId } = await context.params;
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (admin.error) {
    return admin.error;
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof payload.title === "string") {
    const title = payload.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    updates.title = title;
  }
  if (typeof payload.url === "string") {
    updates.url = payload.url.trim();
  }
  if (typeof payload.sort_order === "number" || typeof payload.sortOrder === "number") {
    updates.sort_order =
      typeof payload.sort_order === "number"
        ? payload.sort_order
        : payload.sortOrder;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("study_materials")
    .update(updates)
    .eq("id", materialId)
    .eq("pre_read_id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  return NextResponse.json(
    normalizeStudyMaterial(data as unknown as Record<string, unknown>),
  );
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; materialId: string }> },
) {
  const { id, materialId } = await context.params;
  const supabase = await createClient();
  const admin = await requireAdmin(supabase);
  if (admin.error) {
    return admin.error;
  }

  const { data, error } = await supabase
    .from("study_materials")
    .select("*")
    .eq("id", materialId)
    .eq("pre_read_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  try {
    await deleteMaterial(
      supabase,
      normalizeStudyMaterial(data as unknown as Record<string, unknown>),
    );
  } catch (deleteError) {
    return NextResponse.json(
      {
        error:
          deleteError instanceof Error
            ? deleteError.message
            : "Unable to delete material",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
