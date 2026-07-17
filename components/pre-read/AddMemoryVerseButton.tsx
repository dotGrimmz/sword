"use client";

import { Brain, Check, Loader2 } from "lucide-react";

import { useAddMemoryVerse } from "@/hooks/screens/useAddMemoryVerse";
import controls from "@/components/realign/controls.module.css";

type AddMemoryVerseButtonProps = {
  book: string;
  chapter: number;
  versesRange: string | null;
  memoryVerse: string;
  className?: string;
};

export function AddMemoryVerseButton({
  book,
  chapter,
  versesRange,
  memoryVerse,
  className,
}: AddMemoryVerseButtonProps) {
  const { status, ready, disabled, onAdd, visible } = useAddMemoryVerse({
    book,
    chapter,
    versesRange,
    memoryVerse,
  });

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      className={`${controls.btnPrimary} ${className ?? ""}`}
      onClick={() => void onAdd()}
      disabled={disabled}
    >
      {status === "saving" || !ready ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : status === "added" ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Brain className="h-4 w-4" aria-hidden="true" />
      )}
      {status === "added"
        ? "In memory"
        : status === "saving" || !ready
          ? "Preparing…"
          : "Add to memory"}
    </button>
  );
}
