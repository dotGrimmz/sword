import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("pre_read_comments")
    .delete()
    .eq("id", commentId)
    .select("id")
    .maybeSingle();

  if (error) {
    const status =
      error.code === "42501"
        ? 403
        : error.code === "PGRST116"
          ? 404
          : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (!data) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
