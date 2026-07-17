import { redirect } from "next/navigation";

import type { UserRole } from "@/components/ProfileContext";
import { fetchAdminUsers } from "@/lib/admin/users";
import { createClient } from "@/lib/supabase/server";

import pageStyles from "../AdminPage.module.css";
import UsersManager from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as UserRole | null) ?? null;
  if (role !== "admin") {
    redirect("/dashboard");
  }

  let users: Awaited<ReturnType<typeof fetchAdminUsers>> = [];
  try {
    users = await fetchAdminUsers();
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to load users",
    );
  }

  const withEmail = users.filter((entry) => Boolean(entry.email)).length;
  const withTitle = users.filter((entry) => Boolean(entry.title)).length;

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <p className={pageStyles.eyebrow}>Admin · Users</p>
        <h2 className={pageStyles.title}>Users</h2>
        <p className={pageStyles.description}>
          Browse member contact details and assign optional titles.
        </p>
      </header>

      <section className={pageStyles.statsRow} aria-label="User counts">
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>Users</p>
          <p className={pageStyles.statValue}>{users.length}</p>
          <p className={pageStyles.statMeta}>Total accounts</p>
        </div>
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>With email</p>
          <p className={pageStyles.statValue}>{withEmail}</p>
          <p className={pageStyles.statMeta}>Contact available</p>
        </div>
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>Titled</p>
          <p className={pageStyles.statValue}>{withTitle}</p>
          <p className={pageStyles.statMeta}>Have a title set</p>
        </div>
      </section>

      <div className={pageStyles.sectionSpacer}>
        <UsersManager initialUsers={users} />
      </div>
    </main>
  );
}
