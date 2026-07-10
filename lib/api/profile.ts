import type { Theme } from "@/lib/themes";
import type { UserRole } from "@/components/ProfileContext";

export type ProfileResponse = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  stream_tagline: string | null;
  stream_url: string | null;
  theme: Theme | (string & {}) | null;
  role: UserRole | (string & {});
};

export const getProfile = async (): Promise<ProfileResponse | null> => {
  const response = await fetch("/api/profile", { cache: "no-store" });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    let message = "Unable to load profile.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return (await response.json()) as ProfileResponse;
};
