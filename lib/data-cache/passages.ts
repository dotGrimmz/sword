"use client";

/**
 * @deprecated Prefer `@/lib/query/passages` (`usePassageTextsMap` on TanStack Query).
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { getPassage } from "@/lib/api/bible";
import { cacheKeys, STALE_TIMES } from "@/lib/data-cache/keys";
import { useDataCacheContext } from "@/lib/data-cache/DataCacheProvider";

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
  const response = await getPassage(translationCode, bookName, start, end ?? start);
  return response.verses.map((entry) => entry.text).join(" ");
};

export const fetchPassageText = async (
  cache: ReturnType<typeof useDataCacheContext>,
  translationCode: string,
  bookName: string,
  start: { chapter: number; verse: number },
  end?: { chapter: number; verse: number },
) => {
  const endRef = end ?? start;
  const key = cacheKeys.passage(
    translationCode,
    bookName,
    start.chapter,
    start.verse,
    endRef.chapter,
    endRef.verse,
  );

  return cache.fetch<string>(
    key,
    () => passageTextFromResponse(translationCode, bookName, start, end),
    { staleTime: STALE_TIMES.bible },
  );
};

/**
 * Batch-load passage text for a list of items, backed by DataCacheProvider.
 * Reuses cached passages across Notes, Highlights, and Home screens.
 */
export const usePassageTextsMap = (
  translationCode: string | null,
  requests: PassageTextRequest[],
) => {
  const cache = useDataCacheContext();
  const [texts, setTexts] = useState<Record<string, string>>({});

  const requestSignature = useMemo(
    () =>
      requests
        .map((request) =>
          [
            request.id,
            request.bookName ?? "",
            request.chapter ?? "",
            request.verseStart ?? "",
            request.verseEnd ?? "",
          ].join(":"),
        )
        .join("|"),
    [requests],
  );

  const readSnapshot = useCallback(() => {
    const next: Record<string, string> = {};

    for (const request of requests) {
      if (
        !translationCode ||
        !request.bookName ||
        !request.chapter ||
        !request.verseStart
      ) {
        next[request.id] = "";
        continue;
      }

      const endVerse = request.verseEnd ?? request.verseStart;
      const key = cacheKeys.passage(
        translationCode,
        request.bookName,
        request.chapter,
        request.verseStart,
        request.chapter,
        endVerse,
      );
      const snapshot = cache.getSnapshot<string>(key);
      next[request.id] = snapshot.data ?? "";
    }

    return next;
  }, [cache, requests, translationCode]);

  useEffect(() => {
    if (!translationCode) {
      setTexts({});
      return;
    }

    let cancelled = false;
    const unsubscribers: Array<() => void> = [];

    const syncFromCache = () => {
      if (cancelled) return;
      setTexts(readSnapshot());
    };

    const loadMissing = async () => {
      for (const request of requests) {
        if (
          !request.bookName ||
          !request.chapter ||
          !request.verseStart
        ) {
          continue;
        }

        const endVerse = request.verseEnd ?? request.verseStart;
        const key = cacheKeys.passage(
          translationCode,
          request.bookName,
          request.chapter,
          request.verseStart,
          request.chapter,
          endVerse,
        );

        unsubscribers.push(cache.subscribe(key, syncFromCache));

        const snapshot = cache.getSnapshot<string>(key);
        if (snapshot.data !== undefined && !snapshot.stale) {
          continue;
        }

        try {
          await fetchPassageText(
            cache,
            translationCode,
            request.bookName,
            { chapter: request.chapter, verse: request.verseStart },
            { chapter: request.chapter, verse: endVerse },
          );
        } catch {
          // Individual passage failures are surfaced as empty strings.
        }
      }

      syncFromCache();
    };

    void loadMissing();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [cache, readSnapshot, requestSignature, requests, translationCode]);

  return texts;
};
