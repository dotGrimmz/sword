import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const HOST_SELECT = `
  id,
  username,
  avatar_url,
  stream_tagline,
  stream_url,
  is_host_active,
  role
`;

const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "true";

  let query = supabase
    .from("profiles")
    .select(HOST_SELECT)
    .in("role", ["host", "admin"])
    .order("username", { ascending: true, nullsFirst: false });

  if (activeOnly) {
    query = query.or("role.eq.admin,and(role.eq.host,is_host_active.eq.true)");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) },
    );
  }

  return NextResponse.json(data ?? []);
}
