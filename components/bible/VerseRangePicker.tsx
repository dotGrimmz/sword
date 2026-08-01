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
  /** Inclusive lower bound (defaults to 1). */
  minVerse?: number;
  /** Inclusive upper bound (defaults to verseCount). */
  maxVerse?: number;
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
  minVerse,
  maxVerse,
}: VerseRangePickerProps) {
  const lowerBound = Math.max(1, minVerse ?? 1);
  const upperBound =
    typeof verseCount === "number" && verseCount > 0
      ? Math.min(verseCount, maxVerse ?? verseCount)
      : null;
  const ready =
    typeof upperBound === "number" &&
    upperBound > 0 &&
    upperBound >= lowerBound;
  const parsed = parseVerseRangeValue(value);
  const start = parsed?.start;
  const end = parsed?.end;

  const startOptions = useMemo(() => {
    if (!ready || upperBound == null) return [];
    return Array.from(
      { length: upperBound - lowerBound + 1 },
      (_value, index) => {
        const verse = lowerBound + index;
        return {
          value: String(verse),
          label: String(verse),
          keywords: [String(verse)],
        };
      },
    );
  }, [ready, lowerBound, upperBound]);

  const endOptions = useMemo(() => {
    if (!ready || upperBound == null) return [];
    const min =
      start && start >= lowerBound ? Math.max(start, lowerBound) : lowerBound;
    return Array.from({ length: upperBound - min + 1 }, (_value, index) => {
      const verse = min + index;
      return {
        value: String(verse),
        label: String(verse),
        keywords: [String(verse)],
      };
    });
  }, [ready, lowerBound, upperBound, start]);

  const isDisabled = disabled || !ready;

  const handleStartChange = (nextStartRaw: string) => {
    if (upperBound == null) return;
    const nextStart = Number.parseInt(nextStartRaw, 10);
    if (!Number.isFinite(nextStart)) return;
    const clampedStart = Math.min(
      Math.max(nextStart, lowerBound),
      upperBound,
    );
    const nextEnd =
      end && end >= clampedStart
        ? end
        : Math.max(clampedStart, end ?? clampedStart);
    const clampedEnd = Math.min(Math.max(nextEnd, clampedStart), upperBound);
    onValueChange(formatVerseRange(clampedStart, clampedEnd));
  };

  const handleEndChange = (nextEndRaw: string) => {
    if (upperBound == null) return;
    const nextEnd = Number.parseInt(nextEndRaw, 10);
    if (!Number.isFinite(nextEnd)) return;
    const nextStart =
      start && start >= lowerBound
        ? Math.min(Math.max(start, lowerBound), nextEnd)
        : lowerBound;
    const clampedEnd = Math.min(Math.max(nextEnd, nextStart), upperBound);
    onValueChange(formatVerseRange(nextStart, clampedEnd));
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
          placeholder={ready ? "Start" : "Set study verses first"}
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
          placeholder={ready ? "End" : "Set study verses first"}
          searchPlaceholder="Verse…"
          emptyMessage="No verses."
          triggerClassName={triggerClassName}
          aria-label="End verse"
        />
      </div>
    </div>
  );
}
