import { getAliasesForBookName } from "./bookAliases";
import type { BibleBookSummary } from "@/types/bible";

export type BookSearchable = Pick<
  BibleBookSummary,
  "id" | "name" | "abbreviation"
>;

export type ComboboxFilterOption = {
  value: string;
  label: string;
  keywords?: string[];
};

const normaliseQuery = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Client-side filter for generic combobox options (label + optional keywords).
 */
export function filterComboboxOptions<T extends ComboboxFilterOption>(
  options: T[],
  query: string,
): T[] {
  const needle = normaliseQuery(query);
  if (!needle) {
    return options;
  }

  return options.filter((option) => {
    const haystacks = [
      option.label,
      option.value,
      ...(option.keywords ?? []),
    ].map(normaliseQuery);

    return haystacks.some(
      (haystack) =>
        haystack.includes(needle) ||
        haystack.split(" ").some((token) => token.startsWith(needle)),
    );
  });
}

/**
 * Build searchable keywords for a Bible book (name, abbreviation, aliases).
 */
export function getBookSearchKeywords(
  book: Pick<BibleBookSummary, "name" | "abbreviation">,
): string[] {
  const keywords = new Set<string>(getAliasesForBookName(book.name));
  if (book.abbreviation) {
    keywords.add(book.abbreviation.toLowerCase());
  }
  return Array.from(keywords);
}

/**
 * Client-side book typeahead filter. Matches name, abbreviation, and aliases
 * (e.g. "gen" → Genesis, "1 cor" → 1 Corinthians).
 */
export function filterBooks<T extends BookSearchable>(
  books: T[],
  query: string,
): T[] {
  const options = books.map((book) => ({
    value: book.id,
    label: book.name,
    keywords: getBookSearchKeywords(book),
    book,
  }));

  return filterComboboxOptions(options, query).map((option) => option.book);
}
