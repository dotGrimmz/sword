import Link from "next/link";

import { TopicCard } from "@/app/components/apologetics/TopicCard";
import { fetchPath, normalizeTags, sortPathTopics } from "@/lib/api/apologetics";

interface PathDetailPageProps {
  params: {
    id: string;
  };
}

const difficultyLabel = (value?: string | null) => {
  switch (value) {
    case "intro":
      return "Intro";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Advanced";
    default:
      return value ? value : null;
  }
};

const formatMinutes = (minutes?: number | null) => {
  if (!minutes) return null;
  return `${minutes} min`;
};

export const dynamic = "force-dynamic";

export default async function PathDetailPage({ params }: PathDetailPageProps) {
  const path = await fetchPath(params.id);
  const tags = normalizeTags(path.tags);
  const entries = sortPathTopics(path.path_topics);
  const topics = entries
    .map((entry) => entry.topics)
    .filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));

  const difficulty = difficultyLabel(path.difficulty);
  const estMinutes = formatMinutes(path.est_minutes);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 py-12 md:px-8 lg:px-12">
      <div className="space-y-6">
        <Link
          href="/apologetics"
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to Apologetics
        </Link>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-slate-100">
            {path.title}
          </h1>

          {path.subtitle ? (
            <p className="text-lg text-slate-300">{path.subtitle}</p>
          ) : null}

          {path.description ? (
            <p className="text-base text-slate-300">{path.description}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-400">
            {difficulty ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-[0.65rem] font-semibold">
                {difficulty}
              </span>
            ) : null}
            {estMinutes ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-[0.65rem] font-semibold">
                {estMinutes}
              </span>
            ) : null}
            {topics.length ? (
              <span className="rounded-full border border-slate-700 px-3 py-1 text-[0.65rem] font-semibold">
                {topics.length} topic{topics.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-800/60 px-3 py-1 text-xs uppercase tracking-wide text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">
            Path Topics
          </h2>
          <p className="text-sm text-slate-400">
            Work through each topic in order to complete the path.
          </p>
        </div>

        {topics.length === 0 ? (
          <p className="text-slate-400">
            This path does not have any topics yet.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
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
    </main>
  );
}
