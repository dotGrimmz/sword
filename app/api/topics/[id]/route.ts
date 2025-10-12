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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .eq("id", params.id)
    .single();

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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .update(payload)
    .eq("id", params.id)
    .select(TOPIC_SELECT)
    .single();

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

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .delete()
    .eq("id", params.id)
    .select()
    .single();

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
