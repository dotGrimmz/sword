import type { User } from "@supabase/supabase-js";

/**
 * Providers this app supports today.
 *
 * There is no npm package that normalizes Supabase Auth identities into
 * `public.profiles`. Supabase Auth (GoTrue) already maps OAuth claims into
 * shared `user_metadata` keys (`full_name`, `avatar_url`); the remaining
 * job — pick username for email vs Google and upsert `profiles` — is app code
 * (or a `handle_new_user` DB trigger). See:
 * https://supabase.com/docs/guides/auth/managing-user-data
 */
export type AuthProviderId = "google" | "email";

export type NormalizedIdentity = {
  provider: AuthProviderId;
  userId: string;
  email: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type ProfileSeed = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

const asTrimmed = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const emailLocalPart = (email: string | null | undefined): string | null => {
  if (!email) {
    return null;
  }
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : null;
};

/**
 * Prefer `app_metadata.provider`, then identity provider.
 * Anything that isn't Google is treated as email/password credentials.
 */
export function resolveAuthProvider(user: User): AuthProviderId {
  const candidates = [
    asTrimmed(user.app_metadata?.provider)?.toLowerCase(),
    asTrimmed(user.identities?.find((identity) => identity.provider)?.provider)?.toLowerCase(),
  ];

  if (candidates.includes("google")) {
    return "google";
  }

  return "email";
}

/**
 * Map Supabase Auth user → profile seed fields.
 *
 * Google (via Supabase): `full_name`, `avatar_url` (already normalized by GoTrue).
 * Email: custom `username` from signup `options.data`.
 */
export function normalizeAuthUser(user: User): NormalizedIdentity {
  const provider = resolveAuthProvider(user);
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const email = asTrimmed(user.email);

  if (provider === "google") {
    return {
      provider,
      userId: user.id,
      email,
      username:
        asTrimmed(meta.full_name) ??
        asTrimmed(meta.name) ??
        emailLocalPart(user.email),
      // Prefer GoTrue's avatar_url; picture is only a rare raw-claim fallback.
      avatarUrl: asTrimmed(meta.avatar_url) ?? asTrimmed(meta.picture),
    };
  }

  return {
    provider: "email",
    userId: user.id,
    email,
    username: asTrimmed(meta.username) ?? emailLocalPart(user.email),
    avatarUrl: asTrimmed(meta.avatar_url),
  };
}

export function toProfileSeed(identity: NormalizedIdentity): ProfileSeed {
  return {
    id: identity.userId,
    username: identity.username,
    avatar_url: identity.avatarUrl,
  };
}
