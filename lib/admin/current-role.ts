import type { UserRole } from "@/components/ProfileContext";
import { createClient } from "@/lib/supabase/server";

/** Current signed-in profile role for server pages (null if missing). */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return (data?.role as UserRole | null) ?? null;
}
