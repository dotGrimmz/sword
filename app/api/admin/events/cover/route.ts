import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  removeEventCover,
  uploadEventCover,
} from "@/lib/church-events/covers";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

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

  const previousUrl =
    typeof formData.get("previous_url") === "string"
      ? String(formData.get("previous_url"))
      : null;

  const supabase = await createClient();

  try {
    const url = await uploadEventCover(
      supabase,
      fileValue,
      auth.user.id,
      previousUrl,
    );
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to upload cover",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url : null;
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    await removeEventCover(supabase, url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to remove cover",
      },
      { status: 500 },
    );
  }
}
