import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import type { Theme } from "@/components/ThemeContext";
import { createClient } from "@/lib/supabase/server";

export default async function Layout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  let initialTheme: Theme | null = null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    const { data } = await supabase
      .from("profiles")
      .select("theme")
      .eq("id", session.user.id)
      .maybeSingle();

    if (data?.theme) {
      initialTheme = data.theme as Theme;
    }
  }

  return <AppShell initialTheme={initialTheme}>{children}</AppShell>;
}
