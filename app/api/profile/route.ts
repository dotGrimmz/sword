import { NextResponse } from "next/server";

import { ensureProfile, PROFILE_SELECT } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";

const toTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toNullableString = (value: unknown) => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const toSanitizedUrl = (value: unknown) => {
  const trimmed = toTrimmedString(value);
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Only http or https protocols are allowed.");
    }
    return url.toString();
  } catch {
    throw new Error("Invalid stream URL.");
  }
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profile, error: ensureError } = await ensureProfile(supabase, session.user);

  if (profile) {
    return NextResponse.json(profile);
  }

  // Fallback read if ensure failed (e.g. RLS) but a row already exists.
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: ensureError ?? "Profile not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: {
    displayName?: unknown;
    streamTagline?: unknown;
    streamUrl?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let streamUrl: string | null;
  try {
    streamUrl =
      payload.streamUrl === undefined
        ? null
        : toSanitizedUrl(payload.streamUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid stream URL.",
      },
      { status: 400 },
    );
  }

  const updates = {
    id: session.user.id,
    username: toNullableString(payload.displayName),
    stream_tagline: toNullableString(payload.streamTagline),
    stream_url: streamUrl,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(updates, { onConflict: "id" })
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}
