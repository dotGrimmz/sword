import { NextResponse } from "next/server";

import { BibleLoaderError, fetchPassageDto } from "@/lib/bible/loaders";
import { parsePositiveInteger } from "@/lib/bible/utils";
import { createClient } from "@/lib/supabase/server";

const parseReference = (
  value: string | null,
  paramName: string,
): { data: { chapter: number; verse: number } } | { error: string } => {
  if (!value) {
    return { error: `${paramName} parameter is required` };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { error: `${paramName} parameter cannot be empty` };
  }

  const parts = trimmed.split(":");

  if (parts.length !== 2) {
    return { error: `${paramName} must be in the format chapter:verse` };
  }

  const [rawChapter, rawVerse] = parts;
  const chapter = parsePositiveInteger(rawChapter);

  if (chapter === null) {
    return { error: `${paramName} chapter must be a positive integer` };
  }

  const verse = parsePositiveInteger(rawVerse);

  if (verse === null) {
    return { error: `${paramName} verse must be a positive integer` };
  }

  return { data: { chapter, verse } };
};

const isReferenceBeforeOrEqual = (
  left: { chapter: number; verse: number },
  right: { chapter: number; verse: number },
) =>
  left.chapter < right.chapter ||
  (left.chapter === right.chapter && left.verse <= right.verse);

export async function GET(request: Request) {
  const url = new URL(request.url);

  const translationCode = url.searchParams.get("translation");
  if (!translationCode) {
    return NextResponse.json(
      { error: "Missing required translation query parameter" },
      { status: 400 },
    );
  }

  const bookParam = url.searchParams.get("book");
  if (!bookParam || bookParam.trim().length === 0) {
    return NextResponse.json(
      { error: "book parameter is required" },
      { status: 400 },
    );
  }

  const startValidation = parseReference(url.searchParams.get("start"), "start");
  if ("error" in startValidation) {
    return NextResponse.json({ error: startValidation.error }, { status: 400 });
  }

  const endValidation = parseReference(
    url.searchParams.get("end") ?? url.searchParams.get("start"),
    "end",
  );
  if ("error" in endValidation) {
    return NextResponse.json({ error: endValidation.error }, { status: 400 });
  }

  const startRef = startValidation.data;
  const endRef = endValidation.data;

  if (!isReferenceBeforeOrEqual(startRef, endRef)) {
    return NextResponse.json(
      { error: "start reference must be before or equal to end reference" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  try {
    const response = await fetchPassageDto(
      supabase,
      translationCode,
      bookParam,
      startRef,
      endRef,
    );
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load passage";
    const status = error instanceof BibleLoaderError ? error.status : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
