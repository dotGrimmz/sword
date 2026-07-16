import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import type { UserRole } from "@/components/ProfileContext";
import { resolveTheme } from "@/lib/themes";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("theme, role")
    .eq("id", session.user.id)
    .maybeSingle();

  const role = (data?.role as UserRole | null) ?? null;
  const theme = data?.theme ? resolveTheme(data.theme) : null;

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminShell initialTheme={theme}>{children}</AdminShell>;
}
