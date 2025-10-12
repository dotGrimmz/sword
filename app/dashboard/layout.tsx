import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import type { UserRole } from "@/components/ProfileContext";
import type { Theme } from "@/components/ThemeContext";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  let initialTheme: Theme | null = null;
  let initialRole: UserRole | null = null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    const { data } = await supabase
      .from("profiles")
      .select("theme, role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (data?.theme) {
      initialTheme = data.theme as Theme;
    }
    if (data?.role) {
      initialRole = data.role as UserRole;
    }
  }

  return (
    <AppShell initialTheme={initialTheme} initialRole={initialRole}>
      {children}
    </AppShell>
  );
}
