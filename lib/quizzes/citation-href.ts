import { parseReferenceFromText } from "@/lib/bible/parseReferenceFromText";

/**
 * Build a Bible Reader deep-link from a quiz citation like "John 3:16".
 * Falls back to quiz.book when the citation is chapter:verse only.
 */
export function citationToReaderHref(
  citation: string | null | undefined,
  fallbackBook?: string | null,
): string | null {
  const raw = citation?.trim();
  if (!raw) return null;

  const parsed = parseReferenceFromText(raw);
  const book = parsed.book?.trim() || fallbackBook?.trim() || null;
  const chapter = parsed.chapter;

  if (!book || !chapter || chapter < 1) return null;

  const params = new URLSearchParams({
    book,
    chapter: String(chapter),
  });

  if (parsed.verseStart && parsed.verseStart >= 1) {
    params.set("verse", String(parsed.verseStart));
  }

  return `/dashboard/reader?${params.toString()}`;
}
