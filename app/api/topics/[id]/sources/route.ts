import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
