import Image from "next/image";
import Link from "next/link";

import { TopicCard } from "@/app/components/apologetics/TopicCard";
import { fetchPath, normalizeTags, sortPathTopics } from "@/lib/api/apologetics";
import styles from "../PathDetailPage.module.css";

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
    <main className={styles.page}>
      <Link href="/apologetics" className={styles.backLink}>
        ← Back to Apologetics
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>{path.title}</h1>

        {path.subtitle ? (
          <p className={styles.subtitle}>{path.subtitle}</p>
        ) : null}

        {path.description ? (
          <p className={styles.description}>{path.description}</p>
        ) : null}

        <div className={styles.meta}>
          {difficulty ? (
            <span className={styles.metaChip}>{difficulty}</span>
          ) : null}
          {estMinutes ? (
            <span className={styles.metaChip}>{estMinutes}</span>
          ) : null}
          {topics.length ? (
            <span className={styles.metaChip}>
              {topics.length} topic{topics.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

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
          <h2 className={styles.sectionTitle}>Path Topics</h2>
          <p className={styles.sectionSubtitle}>
            Work through each topic in order to complete the path.
          </p>
        </div>

        {topics.length === 0 ? (
          <div className={styles.emptyState}>
            <Image
              src="/sword_logo.png"
              alt="SWORD logo"
              width={40}
              height={40}
              className={styles.emptyIcon}
            />
            <p className={styles.empty}>This path does not have any topics yet.</p>
          </div>
        ) : (
          <div className={styles.topicGrid}>
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
