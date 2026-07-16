import { NextResponse } from "next/server";

import {
  createLinkMaterial,
  normalizeStudyMaterial,
} from "@/lib/study/materials/strategy";
import { createClient } from "@/lib/supabase/server";

import { errorStatusFromCode, requireAdmin } from "../../utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("study_materials")
    .select("*")
    .eq("pre_read_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  return NextResponse.json(
    (data ?? []).map((row) =>
      normalizeStudyMaterial(row as unknown as Record<string, unknown>),
    ),
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
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

  const kind = payload.kind === "file" ? "file" : "link";
  if (kind === "file") {
    return NextResponse.json(
      {
        error:
          "Use POST /api/pre-reads/[id]/materials/upload for file materials.",
      },
      { status: 400 },
    );
  }

  try {
    const material = await createLinkMaterial(supabase, {
      preReadId: id,
      title: String(payload.title ?? ""),
      url: String(payload.url ?? ""),
      sortOrder:
        typeof payload.sort_order === "number"
          ? payload.sort_order
          : typeof payload.sortOrder === "number"
            ? payload.sortOrder
            : 0,
    });
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to add material",
      },
      { status: 400 },
    );
  }
}
