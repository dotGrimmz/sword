import { NextResponse } from "next/server";

import { BibleLoaderError, fetchTranslations } from "@/lib/bible/loaders";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  try {
    const translations = await fetchTranslations(supabase);
    return NextResponse.json(translations);
  } catch (error) {
    const status =
      error instanceof BibleLoaderError ? error.status : 500;
    return NextResponse.json(
      { error: "Failed to load translations" },
      { status },
    );
  }
}
