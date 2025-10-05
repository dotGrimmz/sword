import { createClient } from "@/lib/supabase/server";
import type {
  BibleBookPreview,
  BibleTranslationSummary,
} from "@/types/bible";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: webTranslation,
    error: translationError,
  } = await supabase
    .from("bible_translations")
    .select("id, code, name, language, version")
    .eq("code", "WEB")
    .maybeSingle();

  if (translationError) {
    return <p>❌ Failed to look up WEB translation: {translationError.message}</p>;
  }

  const {
    data: translations,
    error: listError,
  } = await supabase
    .from("bible_translations")
    .select("code, name, language, version")
    .order("code");

  if (listError) {
    return <p>❌ Failed to load translations: {listError.message}</p>;
  }

  let bookCount: number | null = null;
  let chunkCount: number | null = null;
  let bookPreview: BibleBookPreview[] = [];

  if (webTranslation) {
    const [{ count: books, error: countBooksError }, { count: chunks, error: countChunksError }] =
      await Promise.all([
        supabase
          .from("bible_books")
          .select("id", { count: "exact", head: true })
          .eq("translation_id", webTranslation.id),
        supabase
          .from("scripture_chunks")
          .select("id", { count: "exact", head: true })
          .eq("translation_id", webTranslation.id),
      ]);

    if (countBooksError) {
      return <p>❌ Failed to count books: {countBooksError.message}</p>;
    }
    if (countChunksError) {
      return <p>❌ Failed to count chapters: {countChunksError.message}</p>;
    }

    bookCount = books ?? 0;
    chunkCount = chunks ?? 0;

    const { data: previewData, error: previewError } = await supabase
      .from("bible_books")
      .select("id, name, chapters")
      .eq("translation_id", webTranslation.id)
      .order("order_index", { ascending: true })
      .limit(10);

    if (previewError) {
      return <p>❌ Failed to load book preview: {previewError.message}</p>;
    }

    bookPreview = (previewData ?? []) as BibleBookPreview[];
  }

  const statusMessage = webTranslation
    ? "✅ WEB translation found"
    : "⚠️ WEB translation not found — run the seeding script.";

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-10 font-sans">
      <div>
        <h1 className="text-3xl font-bold">Bible Translation Seed Monitor</h1>
        <p className="text-sm text-slate-500">
          Run <code>node scripts/seed_bible_WEB.mjs</code> to ingest the World English Bible JSON files
          into Supabase.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">WEB Translation Status</h2>
        <p className="mt-2 text-lg">{statusMessage}</p>
        {webTranslation && (
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
              <dd className="text-base font-medium">{webTranslation.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Language</dt>
              <dd className="text-base font-medium">{webTranslation.language}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Version</dt>
              <dd className="text-base font-medium">{webTranslation.version}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Books</dt>
              <dd className="text-base font-medium">{bookCount ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Chapters</dt>
              <dd className="text-base font-medium">{chunkCount ?? "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">WEB Book Preview</h2>
        {webTranslation ? (
          <ul className="mt-3 divide-y divide-slate-200">
            {bookPreview.length === 0 && (
              <li className="py-2 text-sm text-slate-500">No books found for WEB yet.</li>
            )}
            {bookPreview.map((book) => (
              <li key={book.id} className="flex items-center justify-between py-2">
                <span>{book.name}</span>
                <span className="text-sm text-slate-500">{book.chapters} chapters</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Seed the database to populate the WEB translation summary.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">All Translations</h2>
        <ul className="mt-3 divide-y divide-slate-200">
          {((translations ?? []) as BibleTranslationSummary[]).map((translation) => (
            <li key={translation.code} className="flex flex-col py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-base font-medium">{translation.code}</span>
                <span className="ml-2 text-sm text-slate-600">{translation.name}</span>
              </div>
              <div className="mt-1 text-sm text-slate-500 sm:mt-0">
                {translation.language} · {translation.version}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
