import { NextResponse } from "next/server";

import { startOfWeek } from "@/lib/study/week";
import { createClient } from "@/lib/supabase/server";

import {
  PRE_READ_SELECT,
  errorStatusFromCode,
  normalizePreReadPayload,
  normalizeWeeklyStudy,
} from "./utils";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);

  if (url.searchParams.get("current") === "1") {
    const weekStart = startOfWeek(new Date());
    const { data, error } = await supabase
      .from("pre_reads")
      .select(PRE_READ_SELECT)
      .eq("published", true)
      .eq("is_cancelled", false)
      .eq("week_start", weekStart)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: errorStatusFromCode(error.code) },
      );
    }

    if (!data) {
      return NextResponse.json(null);
    }

    return NextResponse.json(
      normalizeWeeklyStudy(data as unknown as Record<string, unknown>),
    );
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
