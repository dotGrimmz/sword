import Link from "next/link";

import { CounterAccordion } from "@/app/components/apologetics/CounterAccordion";
import { EvidenceAccordion } from "@/app/components/apologetics/EvidenceAccordion";
import { SourcePanel } from "@/app/components/apologetics/SourcePanel";
import { TopicCard } from "@/app/components/apologetics/TopicCard";
import {
  extractTopicSources,
  fetchTopic,
  fetchTopics,
  normalizeTags,
} from "@/lib/api/apologetics";
import type { Topic } from "@/types/apologetics";

interface TopicDetailPageProps {
  params: {
    id: string;
  };
}

const findRelatedTopics = (allTopics: Topic[], topicId: string) => {
  const current = allTopics.find((item) => item.id === topicId);
  if (!current) {
    return [];
  }

  const currentTags = new Set(normalizeTags(current.tags));

  const related = allTopics
    .filter((item) => item.id !== topicId)
    .map((candidate) => {
      const candidateTags = normalizeTags(candidate.tags);
      const shared = candidateTags.filter((tag) => currentTags.has(tag));
      return {
        topic: candidate,
        score: shared.length,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.topic);

  if (related.length > 0) {
    return related;
  }

  return allTopics
    .filter((item) => item.id !== topicId)
    .slice(0, 3);
};

export const dynamic = "force-dynamic";

export default async function TopicDetailPage({ params }: TopicDetailPageProps) {
  const [topic, allTopics] = await Promise.all([
    fetchTopic(params.id),
    fetchTopics(),
  ]);

  const tags = normalizeTags(topic.tags);
  const sources = extractTopicSources(topic.topic_sources);
  const relatedTopics = findRelatedTopics(allTopics, topic.id);

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
            {topic.title ?? topic.objection ?? "Untitled Topic"}
          </h1>

          {topic.summary ? (
            <p className="text-lg text-slate-300">{topic.summary}</p>
          ) : null}

          {topic.claim ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-slate-200">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Christian Claim
              </h2>
              <p className="mt-2 text-base">{topic.claim}</p>
            </div>
          ) : null}

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
            Supporting Evidence
          </h2>
          <p className="text-sm text-slate-400">
            Historical, logical, and scriptural support for this topic.
          </p>
        </div>
        <EvidenceAccordion items={topic.evidence ?? []} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">
            Counterarguments
          </h2>
          <p className="text-sm text-slate-400">
            Common objections with thoughtful responses.
          </p>
        </div>
        <CounterAccordion items={topic.counters ?? []} />
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">Sources</h2>
        <SourcePanel sources={sources} />
      </section>

      {relatedTopics.length ? (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-100">
            Related Topics
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {relatedTopics.map((related) => (
              <TopicCard
                key={related.id}
                topic={related}
                href={`/apologetics/topics/${related.id}`}
                showSummary={false}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
