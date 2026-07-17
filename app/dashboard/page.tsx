import { dehydrate } from "@tanstack/react-query";

import { HomePageClient } from "@/components/dashboard/HomePageClient";
import { fetchCurrentStudy } from "@/lib/study/loaders";
import { createClient } from "@/lib/supabase/server";
import { HydrateClient } from "@/lib/query/HydrateClient";
import { getQueryClient } from "@/lib/query/get-query-client";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

export default async function AppHomePage() {
  const supabase = await createClient();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.studyCurrent(),
    queryFn: () => fetchCurrentStudy(supabase),
    staleTime: STALE_TIMES.profile,
  });

  return (
    <HydrateClient state={dehydrate(queryClient)}>
      <HomePageClient />
    </HydrateClient>
  );
}
