"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import { getPassage } from "@/lib/api/bible";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

export type PassageTextRequest = {
  id: string;
  bookName?: string;
  chapter?: number | null;
  verseStart?: number | null;
  verseEnd?: number | null;
};

const passageTextFromResponse = async (
  translationCode: string,
  bookName: string,
  start: { chapter: number; verse: number },
  end?: { chapter: number; verse: number },
) => {
  const response = await getPassage(
    translationCode,
    bookName,
    start,
    end ?? start,
  );
  return response.verses.map((entry) => entry.text).join(" ");
};

/**
 * Batch-load passage text for a list of items via TanStack Query.
 * Reuses cached passages across Notes, Highlights, and Home screens.
 */
export const usePassageTextsMap = (
  translationCode: string | null,
  requests: PassageTextRequest[],
) => {
  const queries = useQueries({
    queries: requests.map((request) => {
      const endVerse = request.verseEnd ?? request.verseStart;
      const enabled = Boolean(
        translationCode &&
          request.bookName &&
          request.chapter &&
          request.verseStart,
      );

      return {
        queryKey: enabled
          ? queryKeys.passage(
              translationCode!,
              request.bookName!,
              request.chapter!,
              request.verseStart!,
              request.chapter!,
              endVerse!,
            )
          : (["passage", "disabled", request.id] as const),
        queryFn: () =>
          passageTextFromResponse(
            translationCode!,
            request.bookName!,
            { chapter: request.chapter!, verse: request.verseStart! },
            { chapter: request.chapter!, verse: endVerse! },
          ),
        staleTime: STALE_TIMES.bible,
        enabled,
      };
    }),
  });

  return useMemo(() => {
    const texts: Record<string, string> = {};
    requests.forEach((request, index) => {
      texts[request.id] = queries[index]?.data ?? "";
    });
    return texts;
  }, [queries, requests]);
};
