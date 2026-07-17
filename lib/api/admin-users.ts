import { apiFetch } from "@/lib/api/fetch";
import type { AdminUserSummary } from "@/types/admin-users";

export type AdminUsersResponse = {
  users: AdminUserSummary[];
};

export const listAdminUsers = () =>
  apiFetch<AdminUsersResponse>("/api/admin/users");

export const updateAdminUserTitle = (id: string, title: string | null) =>
  apiFetch<{ user: AdminUserSummary }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
