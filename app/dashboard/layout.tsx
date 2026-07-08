import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import type { UserRole } from "@/components/ProfileContext";
import type { Theme } from "@/components/ThemeContext";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  let initialTheme: Theme | null = null;
  let initialRole: UserRole | null = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("theme, role")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.theme) {
    initialTheme = data.theme as Theme;
  }
  if (data?.role) {
    initialRole = data.role as UserRole;
  }

  return (
    <AppShell initialTheme={initialTheme} initialRole={initialRole}>
      {children}
    </AppShell>
  );
}
