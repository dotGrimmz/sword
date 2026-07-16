"use client";

import * as React from "react";

import {
  Combobox,
  type ComboboxProps,
} from "@/components/ui/combobox";
import { getBookSearchKeywords } from "@/lib/bible/filterBooks";
import type { BibleBookSummary } from "@/types/bible";

export type BookComboboxProps = {
  books: BibleBookSummary[];
  /** Selected book id or name, depending on `valueKey`. */
  value?: string;
  onValueChange: (value: string, book: BibleBookSummary) => void;
  /**
   * Which field to use as the combobox value.
   * Pre-read forms store book **name**; reader/memory/notes store book **id**.
   */
  valueKey?: "id" | "name";
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  id?: string;
  "aria-label"?: string;
};

/**
 * Client-side Bible book typeahead. Reuses the generic Combobox and matches
 * on name, abbreviation, and shared aliases (e.g. "gen", "1 cor").
 */
export function BookCombobox({
  books,
  value,
  onValueChange,
  valueKey = "id",
  placeholder = "Choose a book",
  searchPlaceholder = "Search books…",
  emptyMessage = "No books match.",
  disabled = false,
  className,
  triggerClassName,
  id,
  "aria-label": ariaLabel = "Bible book",
}: BookComboboxProps) {
  const options = React.useMemo(
    () =>
      books.map((book) => ({
        value: valueKey === "name" ? book.name : book.id,
        label: book.name,
        keywords: getBookSearchKeywords(book),
      })),
    [books, valueKey],
  );

  const bookByValue = React.useMemo(() => {
    const map = new Map<string, BibleBookSummary>();
    for (const book of books) {
      map.set(valueKey === "name" ? book.name : book.id, book);
    }
    return map;
  }, [books, valueKey]);

  const handleChange: ComboboxProps["onValueChange"] = (next) => {
    const book = bookByValue.get(next);
    if (!book) return;
    onValueChange(next, book);
  };

  return (
    <Combobox
      id={id}
      options={options}
      value={value}
      onValueChange={handleChange}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      disabled={disabled}
      className={className}
      triggerClassName={triggerClassName}
      aria-label={ariaLabel}
    />
  );
}
