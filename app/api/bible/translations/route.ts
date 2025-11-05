import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { BibleTranslationSummary } from "@/types/bible";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bible_translations")
    .select("id, code, name, language, version")
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load translations" },
      { status: 500 }
    );
  }

  const translations = (data ?? []) as BibleTranslationSummary[];

  return NextResponse.json(translations);
}
