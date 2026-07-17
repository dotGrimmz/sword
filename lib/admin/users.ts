import type { User } from "@supabase/supabase-js";

import type { UserRole } from "@/components/ProfileContext";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import type { AdminUserSummary } from "@/types/admin-users";

const PAGE_SIZE = 200;

type ProfileRow = {
  id: string;
  username: string | null;
  title: string | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

const asRole = (value: unknown): UserRole => {
  if (value === "admin" || value === "host" || value === "user") {
    return value;
  }
  return "user";
};

const listAuthUsers = async () => {
  const admin = getServiceRoleClient();
  const users: User[] = [];
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) {
      throw new Error(error.message);
    }
    const batch = data.users ?? [];
    users.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    page += 1;
  }

  return users;
};

/** All app users with contact email (service role). Admin console only. */
export async function fetchAdminUsers(): Promise<AdminUserSummary[]> {
  const admin = getServiceRoleClient();
  const authUsers = await listAuthUsers();

  const { data, error } = await admin
    .from("profiles")
    .select("id, username, title, role, avatar_url, created_at");

  if (error) {
    throw new Error(error.message);
  }

  const profiles = (data ?? []) as ProfileRow[];
  const profileById = new Map(profiles.map((row) => [row.id, row]));

  const rows: AdminUserSummary[] = authUsers.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      username: profile?.username ?? null,
      title: profile?.title ?? null,
      role: asRole(profile?.role),
      email: user.email ?? null,
      avatar_url: profile?.avatar_url ?? null,
      created_at: profile?.created_at ?? user.created_at ?? null,
    };
  });

  rows.sort((left, right) => {
    const leftName = (left.username ?? left.email ?? "").toLowerCase();
    const rightName = (right.username ?? right.email ?? "").toLowerCase();
    return leftName.localeCompare(rightName);
  });

  return rows;
}

export async function updateAdminUserTitle(
  userId: string,
  title: string | null,
): Promise<AdminUserSummary> {
  const admin = getServiceRoleClient();
  const normalized =
    typeof title === "string" && title.trim().length > 0
      ? title.trim().slice(0, 80)
      : null;

  const { data, error } = await admin
    .from("profiles")
    .update({ title: normalized } as never)
    .eq("id", userId)
    .select("id, username, title, role, avatar_url, created_at")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const profile = data as ProfileRow | null;
  if (!profile) {
    throw new Error("User profile not found.");
  }

  const { data: authData, error: authError } =
    await admin.auth.admin.getUserById(userId);
  if (authError) {
    throw new Error(authError.message);
  }

  return {
    id: profile.id,
    username: profile.username,
    title: profile.title,
    role: asRole(profile.role),
    email: authData.user?.email ?? null,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
  };
}
