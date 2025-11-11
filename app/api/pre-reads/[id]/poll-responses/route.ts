import { NextResponse } from "next/server";

import { fetchPollSnapshot } from "@/lib/pre-read/poll";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: preRead, error: preReadError } = await supabase
    .from("pre_reads")
    .select("id, poll_options")
    .eq("id", id)
    .maybeSingle();

  if (preReadError) {
    return NextResponse.json(
      { error: preReadError.message },
      { status: 500 },
    );
  }

  if (!preRead?.poll_options || preRead.poll_options.length < 2) {
    return NextResponse.json(
      { error: "Poll not found" },
      { status: 404 },
    );
  }

  try {
    const snapshot = await fetchPollSnapshot({
      preReadId: id,
      optionCount: preRead.poll_options.length,
      supabase,
      userId: user.id,
    });

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load poll snapshot",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { optionIndex?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const optionIndex =
    typeof body.optionIndex === "number" ? body.optionIndex : Number.NaN;

  if (!Number.isInteger(optionIndex) || optionIndex < 0) {
    return NextResponse.json(
      { error: "optionIndex must be a non-negative integer" },
      { status: 400 },
    );
  }

  const { data: preRead, error: preReadError } = await supabase
    .from("pre_reads")
    .select("id, poll_options")
    .eq("id", id)
    .maybeSingle();

  if (preReadError) {
    return NextResponse.json(
      { error: preReadError.message },
      { status: 500 },
    );
  }

  if (!preRead?.poll_options || preRead.poll_options.length < 2) {
    return NextResponse.json(
      { error: "Poll not found" },
      { status: 404 },
    );
  }

  if (optionIndex >= preRead.poll_options.length) {
    return NextResponse.json(
      { error: "optionIndex is out of bounds" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("pre_read_poll_responses").upsert(
    {
      pre_read_id: id,
      user_id: user.id,
      option_index: optionIndex,
    },
    {
      onConflict: "pre_read_id,user_id",
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  try {
    const snapshot = await fetchPollSnapshot({
      preReadId: id,
      optionCount: preRead.poll_options.length,
      supabase,
      userId: user.id,
    });

    return NextResponse.json(snapshot);
  } catch (snapshotError) {
    return NextResponse.json(
      {
        error:
          snapshotError instanceof Error
            ? snapshotError.message
            : "Unable to load poll snapshot",
      },
      { status: 500 },
    );
  }
}
