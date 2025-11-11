import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import {
  PRE_READ_SELECT,
  errorStatusFromCode,
  normalizePreReadPayload,
} from "./utils";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .order("visible_from", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
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
    .insert({
      ...normalized,
      created_by: user.id,
    })
    .select(PRE_READ_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  return NextResponse.json(data, { status: 201 });
}
