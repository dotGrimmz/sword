import { NextResponse } from "next/server";

import { createFileMaterial } from "@/lib/study/materials/strategy";
import { createClient } from "@/lib/supabase/server";

import { requireAdmin } from "../../../utils";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (fileValue.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "File must be 25 MB or less" },
      { status: 400 },
    );
  }

  const title =
    (typeof formData.get("title") === "string"
      ? String(formData.get("title"))
      : fileValue.name) || fileValue.name;

  const sortRaw = formData.get("sort_order") ?? formData.get("sortOrder");
  const sortOrder =
    typeof sortRaw === "string" && sortRaw.trim()
      ? Number.parseInt(sortRaw, 10)
      : 0;

  try {
    const material = await createFileMaterial(supabase, {
      preReadId: id,
      title,
      file: fileValue,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to upload material",
      },
      { status: 500 },
    );
  }
}
