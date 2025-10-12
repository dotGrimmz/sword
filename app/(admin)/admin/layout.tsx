import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import type { UserRole } from "@/components/ProfileContext";
import type { Theme } from "@/components/ThemeContext";
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
  const theme = (data?.theme as Theme | null) ?? null;

  if (role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <AppShell initialTheme={theme} initialRole={role}>
      {children}
    </AppShell>
  );
}
