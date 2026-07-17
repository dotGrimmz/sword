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

export type UpdateProfileInput = {
  displayName: string;
  streamTagline: string;
  streamUrl: string;
};

export const updateProfile = async (
  input: UpdateProfileInput,
): Promise<ProfileResponse> => {
  const response = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json().catch(() => null)) as
    | ProfileResponse
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: string }).error ?? "Unable to update profile."
        : "Unable to update profile.";
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object" || !("id" in payload)) {
    throw new Error("Unexpected response while updating profile.");
  }

  return payload as ProfileResponse;
};

export const uploadProfileAvatar = async (
  file: File,
): Promise<{ avatar_url: string }> => {
  const formData = new FormData();
  formData.append("file", file, file.name);

  const response = await fetch("/api/profile/avatar", {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as
    | { avatar_url?: string; error?: string }
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.error ?? "Unable to upload photo.",
    );
  }

  return { avatar_url: payload?.avatar_url ?? "" };
};

export const deleteProfileAvatar = async (): Promise<void> => {
  const response = await fetch("/api/profile/avatar", {
    method: "DELETE",
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error ?? "Unable to remove photo.");
  }
};
