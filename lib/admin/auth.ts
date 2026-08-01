import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { UserRole } from "@/components/ProfileContext";
import { createClient } from "@/lib/supabase/server";

type Authed = {
  user: { id: string };
  role: UserRole;
  supabase: SupabaseClient;
  error: null;
};

type AuthError = {
  user: null;
  role: null;
  supabase: null;
  error: NextResponse;
};

const accessTokenFromRequest = (request?: Request) => {
  const header = request?.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  return token || undefined;
};

/** Gate admin console APIs — permission role only (`admin`). */
export async function requireAdminOnly(
  request?: Request,
): Promise<Authed | AuthError> {
  const supabase = await createClient(accessTokenFromRequest(request));
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      role: null,
      supabase: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole | null) ?? null;
  if (role !== "admin") {
    return {
      user: null,
      role: null,
      supabase: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: { id: user.id }, role, supabase, error: null };
}
