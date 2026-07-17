"use client";

import { useMemo } from "react";

import { Combobox } from "@/components/ui/combobox";
import {
  formatVerseRange,
  parseVerseRangeValue,
} from "@/lib/bible/verseRange";

import styles from "./VerseRangePicker.module.css";

export type VerseRangePickerProps = {
  /** Total verses in the selected chapter; null until book+chapter are known. */
  verseCount: number | null;
  /** Stored range string, e.g. `"1-26"` or `"5"`. */
  value: string;
  onValueChange: (range: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
};

export { formatVerseRange, parseVerseRangeValue } from "@/lib/bible/verseRange";

/**
 * Client-side from/to verse dropdowns. Bounds come from the loaded chapter.
 */
export function VerseRangePicker({
  verseCount,
  value,
  onValueChange,
  disabled = false,
  className,
  triggerClassName,
}: VerseRangePickerProps) {
  const ready = typeof verseCount === "number" && verseCount > 0;
  const parsed = parseVerseRangeValue(value);
  const start = parsed?.start;
  const end = parsed?.end;

  const startOptions = useMemo(() => {
    if (!ready || !verseCount) return [];
    return Array.from({ length: verseCount }, (_value, index) => {
      const verse = index + 1;
      return {
        value: String(verse),
        label: String(verse),
        keywords: [String(verse)],
      };
    });
  }, [ready, verseCount]);

  const endOptions = useMemo(() => {
    if (!ready || !verseCount) return [];
    const min = start && start >= 1 ? start : 1;
    return Array.from({ length: verseCount - min + 1 }, (_value, index) => {
      const verse = min + index;
      return {
        value: String(verse),
        label: String(verse),
        keywords: [String(verse)],
      };
    });
  }, [ready, verseCount, start]);

  const isDisabled = disabled || !ready;

  const handleStartChange = (nextStartRaw: string) => {
    if (!verseCount) return;
    const nextStart = Number.parseInt(nextStartRaw, 10);
    if (!Number.isFinite(nextStart)) return;
    const nextEnd =
      end && end >= nextStart ? end : Math.max(nextStart, end ?? nextStart);
    const clampedEnd = Math.min(Math.max(nextEnd, nextStart), verseCount);
    onValueChange(formatVerseRange(nextStart, clampedEnd));
  };

  const handleEndChange = (nextEndRaw: string) => {
    if (!verseCount) return;
    const nextEnd = Number.parseInt(nextEndRaw, 10);
    if (!Number.isFinite(nextEnd)) return;
    const nextStart = start && start >= 1 ? Math.min(start, nextEnd) : 1;
    onValueChange(formatVerseRange(nextStart, nextEnd));
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.field}>
        <span className={styles.subLabel}>From</span>
        <Combobox
          options={startOptions}
          value={start ? String(start) : undefined}
          onValueChange={handleStartChange}
          disabled={isDisabled}
          placeholder={ready ? "Start" : "Select chapter first"}
          searchPlaceholder="Verse…"
          emptyMessage="No verses."
          triggerClassName={triggerClassName}
          aria-label="Start verse"
        />
      </div>
      <span className={styles.separator} aria-hidden="true">
        to
      </span>
      <div className={styles.field}>
        <span className={styles.subLabel}>To</span>
        <Combobox
          options={endOptions}
          value={end ? String(end) : undefined}
          onValueChange={handleEndChange}
          disabled={isDisabled || !start}
          placeholder={ready ? "End" : "Select chapter first"}
          searchPlaceholder="Verse…"
          emptyMessage="No verses."
          triggerClassName={triggerClassName}
          aria-label="End verse"
        />
      </div>
    </div>
  );
}
