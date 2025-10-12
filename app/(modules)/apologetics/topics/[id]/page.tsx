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
import styles from "../TopicDetailPage.module.css";

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
    <main className={styles.page}>
      <Link href="/apologetics" className={styles.backLink}>
        ← Back to Apologetics
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>
          {topic.title ?? topic.objection ?? "Untitled Topic"}
        </h1>

        {topic.summary ? (
          <p className={styles.summary}>{topic.summary}</p>
        ) : null}

        {topic.claim ? (
          <div className={styles.claim}>
            <p className={styles.claimHeading}>Christian Claim</p>
            <p>{topic.claim}</p>
          </div>
        ) : null}

        {tags.length ? (
          <div className={styles.tagList}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <section className={styles.section}>
        <div>
          <h2 className={styles.sectionTitle}>Supporting Evidence</h2>
          <p className={styles.sectionSubtitle}>
            Historical, logical, and scriptural support for this topic.
          </p>
        </div>
        <EvidenceAccordion items={topic.evidence ?? []} />
      </section>

      <section className={styles.section}>
        <div>
          <h2 className={styles.sectionTitle}>Counterarguments</h2>
          <p className={styles.sectionSubtitle}>
            Common objections with thoughtful responses.
          </p>
        </div>
        <CounterAccordion items={topic.counters ?? []} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sources</h2>
        <SourcePanel sources={sources} />
      </section>

      {relatedTopics.length ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Related Topics</h2>
          <div className={styles.relatedGrid}>
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
