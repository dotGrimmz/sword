import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const TOPIC_SELECT = `
  *,
  evidence(*),
  counters(*),
  topic_sources(*, sources(*))
`;

const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("topics").select(TOPIC_SELECT);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .insert(payload)
    .select(TOPIC_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, ...updates } = payload;

  if (!id) {
    return NextResponse.json(
      { error: "Missing id in request body" },
      { status: 400 }
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields provided to update" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .update(updates)
    .eq("id", id)
    .select(TOPIC_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
