"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { VerseRangePicker } from "@/components/bible/VerseRangePicker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatVerseRange,
  parseVerseRangeValue,
} from "@/lib/bible/verseRange";
import type { BiblePassageResponse } from "@/types/bible";

import styles from "./MemoryVerseEditor.module.css";

const DEFAULT_TRANSLATION_CODE = "WEB";

export type MemoryVerseEditorProps = {
  book: string;
  chapter: number | null;
  studyVersesRange: string;
  memoryVersesRange: string;
  memoryVerseText: string;
  onMemoryVersesRangeChange: (range: string) => void;
  onMemoryVerseTextChange: (text: string) => void;
  disabled?: boolean;
  controlClassName?: string;
};

export function MemoryVerseEditor({
  book,
  chapter,
  studyVersesRange,
  memoryVersesRange,
  memoryVerseText,
  onMemoryVersesRangeChange,
  onMemoryVerseTextChange,
  disabled = false,
  controlClassName,
}: MemoryVerseEditorProps) {
  const studyBounds = useMemo(
    () => parseVerseRangeValue(studyVersesRange),
    [studyVersesRange],
  );
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const textEditedRef = useRef(Boolean(memoryVerseText.trim()));
  // Preserve saved text on first paint when a range already exists.
  const lastFetchedRangeRef = useRef<string | null>(
    memoryVersesRange.trim() && memoryVerseText.trim()
      ? memoryVersesRange
      : null,
  );

  const canPick = Boolean(
    book.trim() &&
      typeof chapter === "number" &&
      chapter >= 1 &&
      studyBounds,
  );

  useEffect(() => {
    if (!studyBounds || !memoryVersesRange.trim()) return;
    const memoryBounds = parseVerseRangeValue(memoryVersesRange);
    if (!memoryBounds) {
      onMemoryVersesRangeChange("");
      return;
    }
    if (
      memoryBounds.start < studyBounds.start ||
      memoryBounds.end > studyBounds.end
    ) {
      onMemoryVersesRangeChange("");
      onMemoryVerseTextChange("");
      textEditedRef.current = false;
      lastFetchedRangeRef.current = null;
    }
  }, [
    studyBounds,
    memoryVersesRange,
    onMemoryVersesRangeChange,
    onMemoryVerseTextChange,
  ]);

  useEffect(() => {
    if (!canPick || !memoryVersesRange.trim() || !studyBounds) {
      setIsLoadingText(false);
      setLoadError(null);
      return;
    }

    const memoryBounds = parseVerseRangeValue(memoryVersesRange);
    if (!memoryBounds) return;

    // Skip if we already hydrated this exact range selection.
    if (lastFetchedRangeRef.current === memoryVersesRange) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    const loadPassage = async () => {
      try {
        setIsLoadingText(true);
        setLoadError(null);
        const params = new URLSearchParams({
          translation: DEFAULT_TRANSLATION_CODE,
          book: book.trim(),
          start: `${chapter}:${memoryBounds.start}`,
          end: `${chapter}:${memoryBounds.end}`,
        });
        const response = await fetch(`/api/bible/passage?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Unable to load verse text");
        }
        const payload = (await response.json()) as BiblePassageResponse;
        if (!active) return;
        const text = payload.verses
          .map((verse) => verse.text.trim())
          .filter(Boolean)
          .join(" ");
        lastFetchedRangeRef.current = memoryVersesRange;
        textEditedRef.current = false;
        onMemoryVerseTextChange(text);
      } catch (error) {
        if (!active || (error as Error).name === "AbortError") return;
        setLoadError(
          error instanceof Error ? error.message : "Unable to load verse text",
        );
      } finally {
        if (active) setIsLoadingText(false);
      }
    };

    void loadPassage();
    return () => {
      active = false;
      controller.abort();
    };
  }, [canPick, book, chapter, memoryVersesRange, studyBounds, onMemoryVerseTextChange]);

  const handleRangeChange = (range: string) => {
    textEditedRef.current = false;
    lastFetchedRangeRef.current = null;
    onMemoryVersesRangeChange(range);
  };

  const handleTextChange = (value: string) => {
    textEditedRef.current = true;
    onMemoryVerseTextChange(value);
  };

  const handleClear = () => {
    textEditedRef.current = false;
    lastFetchedRangeRef.current = null;
    onMemoryVersesRangeChange("");
    onMemoryVerseTextChange("");
    setLoadError(null);
  };

  const boundsLabel = studyBounds
    ? formatVerseRange(studyBounds.start, studyBounds.end)
    : null;

  return (
    <div className={styles.root}>
      <div className={styles.headerRow}>
        <Label className={styles.label}>Memory verse (optional)</Label>
        {memoryVersesRange || memoryVerseText ? (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            disabled={disabled}
          >
            Clear
          </button>
        ) : null}
      </div>

      <VerseRangePicker
        verseCount={studyBounds?.end ?? null}
        minVerse={studyBounds?.start}
        maxVerse={studyBounds?.end}
        value={memoryVersesRange}
        onValueChange={handleRangeChange}
        disabled={disabled || !canPick}
        triggerClassName={controlClassName}
      />

      <p className={styles.helper}>
        {!canPick
          ? "Set the study book, chapter, and verse range first."
          : isLoadingText
            ? "Loading verse text…"
            : loadError
              ? loadError
              : boundsLabel
                ? `Choose verses within the study passage (${boundsLabel}). Text fills automatically and stays editable.`
                : "Choose verses within the study passage."}
      </p>

      {memoryVersesRange || memoryVerseText ? (
        <div className={styles.preview}>
          <p className={styles.previewEyebrow}>Verse text</p>
          <Textarea
            id="memory_verse"
            className={`${styles.textarea} ${controlClassName ?? ""}`.trim()}
            value={memoryVerseText}
            onChange={(event) => handleTextChange(event.target.value)}
            disabled={disabled || isLoadingText}
            placeholder="Selected verse text will appear here"
          />
        </div>
      ) : null}
    </div>
  );
}
