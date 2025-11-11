import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  PRE_READ_SELECT,
  errorStatusFromCode,
  normalizePreReadPayload,
} from "../utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Pre-Read not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
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

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let normalized;
  try {
    normalized = normalizePreReadPayload(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payload" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("pre_reads")
    .update(normalized)
    .eq("id", id)
    .select(PRE_READ_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Pre-Read not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
