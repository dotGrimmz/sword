import type { SupabaseClient, User } from "@supabase/supabase-js";

import { normalizeAuthUser, toProfileSeed } from "@/lib/auth/providers/normalize";

export const PROFILE_SELECT =
  "id, username, avatar_url, stream_tagline, stream_url, role, theme";

export type EnsuredProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  stream_tagline: string | null;
  stream_url: string | null;
  role: string | null;
  theme: string | null;
};

type EnsureProfileResult = {
  profile: EnsuredProfile | null;
  created: boolean;
  error: string | null;
};

/**
 * Ensure a `profiles` row exists for the auth user.
 *
 * - Creates a row from normalized provider identity when missing.
 * - If a row exists, only fills null `username` / `avatar_url` (never overwrites user edits).
 * - Returns the current profile row (or null on failure).
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<EnsureProfileResult> {
  const identity = normalizeAuthUser(user);
  const seed = toProfileSeed(identity);

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  if (existingError) {
    return { profile: null, created: false, error: existingError.message };
  }

  if (!existing) {
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .upsert(seed, { onConflict: "id" })
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (createError) {
      return { profile: null, created: false, error: createError.message };
    }

    return {
      profile: (created as EnsuredProfile | null) ?? null,
      created: true,
      error: null,
    };
  }

  const fillUsername = !existing.username && seed.username;
  // Only seed avatar on first create. If the row exists with a null avatar,
  // the user may have explicitly removed it — don't pull Google photo back.

  if (!fillUsername) {
    return {
      profile: existing as EnsuredProfile,
      created: false,
      error: null,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({
      username: seed.username,
    })
    .eq("id", user.id)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (updateError) {
    // Prefer returning the existing row over failing the auth flow.
    return {
      profile: existing as EnsuredProfile,
      created: false,
      error: updateError.message,
    };
  }

  return {
    profile: (updated as EnsuredProfile | null) ?? (existing as EnsuredProfile),
    created: false,
    error: null,
  };
}
