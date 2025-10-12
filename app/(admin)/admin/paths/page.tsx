import { notFound } from "next/navigation";

import { fetchPaths } from "@/lib/api/apologetics";
import PathsManager from "./PathsManager";

export const dynamic = "force-dynamic";

export default async function AdminPathsPage() {
  const paths = await fetchPaths();

  if (!paths) {
    notFound();
  }

  const initialPaths = paths.map((path) => ({
    id: path.id,
    title: path.title ?? "",
    subtitle: path.subtitle ?? "",
    description: path.description ?? "",
    difficulty: path.difficulty ?? "intro",
    est_minutes:
      typeof path.est_minutes === "number" ? path.est_minutes : null,
    tags:
      Array.isArray(path.tags)
        ? path.tags.filter(Boolean)
        : typeof path.tags === "string"
          ? path.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
    updated_at: path.updated_at ?? null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 md:px-8 lg:px-12">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Admin · Paths
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">
          Manage Learning Paths
        </h1>
        <p className="max-w-2xl text-base text-slate-300">
          Paths combine multiple topics into guided learning journeys. Update the
          metadata here to influence how they appear throughout the app.
        </p>
      </header>

      <PathsManager initialPaths={initialPaths} />
    </main>
  );
}
