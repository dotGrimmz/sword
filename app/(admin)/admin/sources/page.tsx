import { notFound } from "next/navigation";

import { fetchSources } from "@/lib/api/apologetics";
import SourcesManager from "./SourcesManager";

export const dynamic = "force-dynamic";

export default async function AdminSourcesPage() {
  const sources = await fetchSources();

  if (!sources) {
    notFound();
  }

  const initialSources = sources.map((source) => ({
    id: source.id,
    type: source.type ?? "",
    author: source.author ?? "",
    work: source.work ?? "",
    year_or_era: source.year_or_era ?? "",
    location: source.location ?? "",
    url: source.url ?? "",
    notes: source.notes ?? "",
    updated_at: source.updated_at ?? null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 md:px-8 lg:px-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Admin · Sources
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">
          Manage Sources & References
        </h1>
        <p className="max-w-2xl text-base text-slate-300">
          Add or update supporting references used across apologetics topics and
          paths. Well-documented sources help learners dig deeper.
        </p>
      </header>

      <SourcesManager initialSources={initialSources} />
    </main>
  );
}
