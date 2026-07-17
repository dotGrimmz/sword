import { NextResponse } from "next/server";

import type { UserRole } from "@/components/ProfileContext";
import { createClient } from "@/lib/supabase/server";

type Authed = {
  user: { id: string };
  role: UserRole;
  error: null;
};

type AuthError = {
  user: null;
  role: null;
  error: NextResponse;
};

/** Gate admin console APIs — permission role only (`admin`). */
export async function requireAdminOnly(): Promise<Authed | AuthError> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      role: null,
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
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user: { id: user.id }, role, error: null };
}
