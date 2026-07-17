import type { ReactNode } from "react";
import { dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import type { UserRole } from "@/components/ProfileContext";
import { fetchTranslations } from "@/lib/bible/loaders";
import { HydrateClient } from "@/lib/query/HydrateClient";
import { getQueryClient } from "@/lib/query/get-query-client";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import { resolveTheme, type Theme } from "@/lib/themes";
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
    // resolveTheme maps previous default "ocean" → realign
    initialTheme = resolveTheme(data.theme);
  }
  if (data?.role) {
    initialRole = data.role as UserRole;
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.translations(),
    queryFn: () => fetchTranslations(supabase),
    staleTime: STALE_TIMES.translations,
  });

  return (
    <AppShell initialTheme={initialTheme} initialRole={initialRole}>
      <HydrateClient state={dehydrate(queryClient)}>{children}</HydrateClient>
    </AppShell>
  );
}
