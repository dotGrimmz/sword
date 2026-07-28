"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";

import {
  TranslationProvider,
  useTranslationContext,
} from "@/components/TranslationContext";
import { getChapterContent, getPassage } from "@/lib/api/bible";
import { parseVerseRangeValue } from "@/lib/bible/verseRange";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import type { BiblePassageVerse } from "@/types/bible";

import styles from "./ScripturePassagePager.module.css";

export type ScripturePassagePagerProps = {
  book: string;
  chapter: number;
  versesRange?: string | null;
  className?: string;
};

function ScripturePassagePagerInner({
  book,
  chapter,
  versesRange = null,
  className,
}: ScripturePassagePagerProps) {
  const { translationCode, isLoadingTranslations } = useTranslationContext();

  const bookName = book.trim();
  const parsedRange = versesRange ? parseVerseRangeValue(versesRange) : null;
  const useFullChapter = !parsedRange;
  const canFetch = Boolean(
    translationCode && bookName && Number.isFinite(chapter) && chapter >= 1,
  );

  const passageQuery = useQuery({
    queryKey:
      canFetch && parsedRange
        ? queryKeys.passage(
            translationCode!,
            bookName,
            chapter,
            parsedRange.start,
            chapter,
            parsedRange.end,
          )
        : (["passage", "pre-read", "disabled"] as const),
    queryFn: () =>
      getPassage(
        translationCode!,
        bookName,
        { chapter, verse: parsedRange!.start },
        { chapter, verse: parsedRange!.end },
      ),
    staleTime: STALE_TIMES.bible,
    enabled: canFetch && Boolean(parsedRange),
  });

  const chapterQuery = useQuery({
    queryKey: canFetch
      ? queryKeys.chapter(translationCode!, bookName, chapter)
      : (["chapter", "pre-read", "disabled"] as const),
    queryFn: async () => {
      const response = await getChapterContent(
        translationCode!,
        bookName,
        chapter,
      );
      return response.verses;
    },
    staleTime: STALE_TIMES.bible,
    enabled: canFetch && useFullChapter,
  });

  const verses: BiblePassageVerse[] = useMemo(() => {
    if (parsedRange) {
      return passageQuery.data?.verses ?? [];
    }
    return (chapterQuery.data ?? []).map((verse) => ({
      chapter,
      verse: verse.verse,
      text: verse.text,
    }));
  }, [parsedRange, passageQuery.data?.verses, chapterQuery.data, chapter]);

  const isLoading =
    isLoadingTranslations ||
    (canFetch &&
      (parsedRange ? passageQuery.isLoading : chapterQuery.isLoading));
  const isError = parsedRange ? passageQuery.isError : chapterQuery.isError;
  const totalVerses = verses.length;

  const rangeLabel =
    totalVerses === 0
      ? null
      : totalVerses === 1
        ? `Verse ${verses[0].verse}`
        : `Verses ${verses[0].verse}–${verses[totalVerses - 1].verse} · ${totalVerses} total`;

  return (
    <section
      className={clsx(styles.card, className)}
      aria-label="Scripture reading"
    >
      <p className={styles.eyebrow}>Scripture</p>

      {!canFetch ? (
        <p className={styles.status}>Scripture is not set yet.</p>
      ) : isLoading ? (
        <p className={styles.status}>Loading scripture…</p>
      ) : isError ? (
        <p className={clsx(styles.status, styles.statusError)}>
          Unable to load this passage right now.
        </p>
      ) : totalVerses === 0 ? (
        <p className={styles.status}>No verses available for this selection.</p>
      ) : (
        <>
          {rangeLabel ? <p className={styles.meta}>{rangeLabel}</p> : null}
          <div className={styles.scrollPane} tabIndex={0}>
            <ol className={styles.verseList}>
              {verses.map((verse) => (
                <li
                  key={`${verse.chapter}:${verse.verse}`}
                  className={styles.verseItem}
                >
                  <span className={styles.verseNumber} aria-hidden="true">
                    {verse.verse}
                  </span>
                  <p className={clsx("scripture-text", styles.verseText)}>
                    {verse.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <p className={styles.scrollHint}>Scroll to read the full passage</p>
        </>
      )}
    </section>
  );
}

export function ScripturePassagePager(props: ScripturePassagePagerProps) {
  return (
    <TranslationProvider>
      <ScripturePassagePagerInner {...props} />
    </TranslationProvider>
  );
}
