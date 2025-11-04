import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const { id } =
    context.params instanceof Promise
      ? await context.params
      : context.params;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topic_sources")
    .select("*, sources(*)")
    .eq("topic_id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  return NextResponse.json(data ?? []);
}
