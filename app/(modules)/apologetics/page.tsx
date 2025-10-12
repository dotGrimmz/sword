import type { Metadata } from "next";

import { PathCard } from "@/app/components/apologetics/PathCard";
import { TopicCard } from "@/app/components/apologetics/TopicCard";
import { fetchPaths, fetchTopics } from "@/lib/api/apologetics";

export const metadata: Metadata = {
  title: "Apologetics | SWORD",
  description:
    "Explore apologetics topics, curated learning paths, and trusted sources to strengthen your defense of the faith.",
};

export const dynamic = "force-dynamic";

export default async function ApologeticsHomePage() {
  const [topics, paths] = await Promise.all([fetchTopics(), fetchPaths()]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 md:px-8 lg:px-12">
      <section className="space-y-6">
        <h1 className="text-3xl font-semibold text-slate-100">
          Apologetics Module
        </h1>
        <p className="max-w-2xl text-lg text-slate-300">
          Engage with curated topics, evidence, and learning paths that equip
          you to respond with confidence and grace. Each topic gathers
          scriptural grounding, historical sources, and counterarguments to help
          you communicate truth clearly.
        </p>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Topics</h2>
            <p className="text-sm text-slate-400">
              Explore objections and their gospel-centered responses.
            </p>
          </div>
        </div>

        {topics.length === 0 ? (
          <p className="text-slate-400">
            No topics have been published yet. Check back soon.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                href={`/apologetics/topics/${topic.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-100">Paths</h2>
            <p className="text-sm text-slate-400">
              Guided learning journeys that combine multiple topics.
            </p>
          </div>
        </div>

        {paths.length === 0 ? (
          <p className="text-slate-400">
            No learning paths are available yet. Add paths in Supabase to see
            them here.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {paths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                href={`/apologetics/paths/${path.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
