import { PROFILE_SELECT, type EnsuredProfile } from "@/lib/auth/ensure-profile";
import type { SupabaseDbClient } from "@/lib/bible/queries";
import type { ProfileResponse } from "@/lib/api/profile";

export class ProfileLoaderError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ProfileLoaderError";
    this.status = status;
  }
}

export async function fetchProfileByUserId(
  client: SupabaseDbClient,
  userId: string,
): Promise<ProfileResponse | null> {
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ProfileLoaderError(
      error.message,
      error.code === "PGRST116" ? 404 : 500,
    );
  }

  if (!data) {
    return null;
  }

  const row = data as EnsuredProfile;
  return {
    id: row.id,
    username: row.username,
    avatar_url: row.avatar_url,
    stream_tagline: row.stream_tagline,
    stream_url: row.stream_url,
    theme: row.theme,
    role: row.role ?? "member",
  };
}
