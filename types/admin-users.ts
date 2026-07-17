import type { UserRole } from "@/components/ProfileContext";

export type AdminUserSummary = {
  id: string;
  username: string | null;
  title: string | null;
  role: UserRole;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
};
