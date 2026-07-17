import { cookies } from "next/headers";
import { dehydrate } from "@tanstack/react-query";

import { ReaderPageClient } from "@/components/dashboard/ReaderPageClient";
import {
  BibleLoaderError,
  fetchChapterDto,
  fetchTranslations,
} from "@/lib/bible/loaders";
import { parsePositiveInteger } from "@/lib/bible/utils";
import { HydrateClient } from "@/lib/query/HydrateClient";
import { getQueryClient } from "@/lib/query/get-query-client";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_TRANSLATION_COOKIE } from "@/lib/translation/cookie";

type ReaderPageProps = {
  searchParams?: Promise<{ book?: string; chapter?: string }>;
};

export default async function ReaderPage({ searchParams }: ReaderPageProps) {
  const params = (await searchParams) ?? {};
  const book = typeof params.book === "string" ? params.book : null;
  const chapter = params.chapter
    ? parsePositiveInteger(params.chapter)
    : null;

  const queryClient = getQueryClient();
  const supabase = await createClient();

  if (book && chapter !== null) {
    try {
      const cookieStore = await cookies();
      const cookieCode = cookieStore.get(ACTIVE_TRANSLATION_COOKIE)?.value;
      const translations = await fetchTranslations(supabase);
      const translationCode =
        (cookieCode
          ? decodeURIComponent(cookieCode)
          : null) ??
        translations[0]?.code ??
        null;

      if (translationCode) {
        await queryClient.prefetchQuery({
          queryKey: queryKeys.translations(),
          queryFn: async () => translations,
          staleTime: STALE_TIMES.translations,
        });

        await queryClient.prefetchQuery({
          queryKey: queryKeys.chapter(translationCode, book, chapter),
          queryFn: async () => {
            const response = await fetchChapterDto(
              supabase,
              translationCode,
              book,
              chapter,
            );
            return response.verses;
          },
          staleTime: STALE_TIMES.bible,
        });
      }
    } catch (error) {
      if (!(error instanceof BibleLoaderError)) {
        console.error("Failed to prefetch reader chapter", error);
      }
    }
  }

  return (
    <HydrateClient state={dehydrate(queryClient)}>
      <ReaderPageClient />
    </HydrateClient>
  );
}
