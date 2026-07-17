import { NextResponse } from "next/server";

import { fetchCurrentStudy, LoaderError } from "@/lib/study/loaders";
import { createClient } from "@/lib/supabase/server";

import {
  PRE_READ_SELECT,
  errorStatusFromCode,
  normalizePreReadPayload,
} from "./utils";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);

  if (url.searchParams.get("current") === "1") {
    try {
      const study = await fetchCurrentStudy(supabase);
      return NextResponse.json(study);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load study";
      const code = error instanceof LoaderError ? error.code : undefined;
      return NextResponse.json(
        { error: message },
        { status: errorStatusFromCode(code) },
      );
    }
  }

  const { data, error } = await supabase
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .order("week_start", { ascending: false, nullsFirst: false })
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
