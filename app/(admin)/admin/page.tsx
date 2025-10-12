import Link from "next/link";
import { BookMarked, ListChecks, Route } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchPaths,
  fetchSources,
  fetchTopics,
} from "@/lib/api/apologetics";

export const dynamic = "force-dynamic";

const cards = [
  {
    name: "Topics",
    description: "Core objections, claims, and curated evidence.",
    href: "/admin/topics",
    icon: BookMarked,
    tone: "from-sky-500/30 to-sky-700/10",
  },
  {
    name: "Paths",
    description: "Learning journeys that sequence multiple topics.",
    href: "/admin/paths",
    icon: Route,
    tone: "from-emerald-500/30 to-emerald-700/10",
  },
  {
    name: "Sources",
    description: "Supporting references and recommended reading.",
    href: "/admin/sources",
    icon: ListChecks,
    tone: "from-amber-500/30 to-amber-700/10",
  },
];

export default async function AdminOverviewPage() {
  const [topics, paths, sources] = await Promise.all([
    fetchTopics(),
    fetchPaths(),
    fetchSources(),
  ]);

  const counts = {
    Topics: topics.length,
    Paths: paths.length,
    Sources: sources.length,
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 md:px-8 lg:px-12">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Admin Console
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">
          Apologetics Management
        </h1>
        <p className="max-w-2xl text-base text-slate-300">
          Create, edit, and curate apologetics content for the SWORD community.
          Use the panels below to manage topics, learning paths, and supporting
          sources.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const total = counts[card.name as keyof typeof counts] ?? 0;

          return (
            <Card
              key={card.name}
              className="relative overflow-hidden border border-slate-800/70 bg-slate-900/60 shadow-lg shadow-slate-950/40 backdrop-blur"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.tone}`}
                aria-hidden="true"
              />
              <CardHeader className="relative space-y-3">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="inline-flex items-center gap-2 text-sm uppercase tracking-wide text-slate-400">
                    <Icon className="size-4 text-slate-200" />
                    {card.name}
                  </span>
                  <span className="text-2xl font-semibold text-slate-100">
                    {total}
                  </span>
                </div>
                <CardTitle className="text-lg text-slate-100">
                  {card.description}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <Link
                  href={card.href}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/70 hover:text-primary/80"
                >
                  Manage {card.name}
                  <span aria-hidden="true">→</span>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </main>
  );
}
