import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { errorStatusFromCode } from "../../pre-reads/utils";

const HOST_SELECT = `
  id,
  username,
  avatar_url,
  stream_tagline,
  stream_url,
  is_host_active,
  role
`;

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

  let payload: {
    username?: unknown;
    avatar_url?: unknown;
    stream_tagline?: unknown;
    stream_url?: unknown;
    is_host_active?: unknown;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sanitize = (value: unknown) => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const updates = {
    username: sanitize(payload.username),
    avatar_url: sanitize(payload.avatar_url),
    stream_tagline: sanitize(payload.stream_tagline),
    stream_url: sanitize(payload.stream_url),
    is_host_active: Boolean(payload.is_host_active),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select(HOST_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
