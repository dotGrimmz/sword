import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("counters")
    .select("*, counter_sources(*, sources(*))")
    .eq("topic_id", params.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topic_id: _ignored, ...rest } = payload;
  const supabasePayload = { ...rest, topic_id: params.id };

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("counters")
    .insert(supabasePayload)
    .select("*, counter_sources(*, sources(*))")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  return NextResponse.json(data, { status: 201 });
}
