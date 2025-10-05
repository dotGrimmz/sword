import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export type SupabaseDbClient = SupabaseClient<Database>;

export const fetchTranslationByCode = (client: SupabaseDbClient, code: string) =>
  client
    .from("bible_translations")
    .select("id, code, name, language, version")
    .eq("code", code)
    .maybeSingle();

export const fetchBooksForTranslation = (
  client: SupabaseDbClient,
  translationId: string
) =>
  client
    .from("bible_books")
    .select("id, name, abbreviation, chapters, order_index")
    .eq("translation_id", translationId)
    .order("order_index", { ascending: true });

export const fetchBookByName = (
  client: SupabaseDbClient,
  translationId: string,
  bookNamePattern: string
) =>
  client
    .from("bible_books")
    .select("id, name, abbreviation, chapters")
    .eq("translation_id", translationId)
    .ilike("name", bookNamePattern)
    .maybeSingle();

export const fetchChapterContent = (
  client: SupabaseDbClient,
  translationId: string,
  bookId: string,
  chapter: number
) =>
  client
    .from("scripture_chunks")
    .select("content_json")
    .eq("translation_id", translationId)
    .eq("book_id", bookId)
    .eq("chapter", chapter)
    .maybeSingle();
