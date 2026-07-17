import { NextResponse } from "next/server";

import { createLinkMaterial } from "@/lib/study/materials/strategy";
import { fetchStudyMaterials, LoaderError } from "@/lib/study/loaders";
import { createClient } from "@/lib/supabase/server";

import { errorStatusFromCode, requireAdmin } from "../../utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  try {
    const materials = await fetchStudyMaterials(supabase, id);
    return NextResponse.json(materials);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load materials";
    const code = error instanceof LoaderError ? error.code : undefined;
    return NextResponse.json(
      { error: message },
      { status: errorStatusFromCode(code) },
    );
  }
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
