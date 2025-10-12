import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { PathCard } from "@/app/components/apologetics/PathCard";
import { TopicCard } from "@/app/components/apologetics/TopicCard";
import { fetchPaths, fetchTopics } from "@/lib/api/apologetics";
import styles from "./ApologeticsHomePage.module.css";

export const metadata: Metadata = {
  title: "Apologetics | SWORD",
  description:
    "Explore apologetics topics, curated learning paths, and trusted sources to strengthen your defense of the faith.",
};

export const dynamic = "force-dynamic";

export default async function ApologeticsHomePage() {
  const [topics, paths] = await Promise.all([fetchTopics(), fetchPaths()]);

  return (
    <main className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/dashboard" className={styles.backLink}>
          ← Back to dashboard
        </Link>
      </div>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Apologetics Module</h1>
        <p className={styles.heroSubtitle}>
          Engage with curated topics, evidence, and learning paths that equip you
          to respond with confidence and grace. Each topic gathers scriptural
          grounding, historical sources, and counterarguments to help you
          communicate truth clearly.
        </p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Topics</h2>
          <p className={styles.sectionSubtitle}>
            Explore objections and their gospel-centered responses.
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
            <p className={styles.empty}>
              No topics have been published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className={styles.gridTopics}>
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

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Paths</h2>
          <p className={styles.sectionSubtitle}>
            Guided learning journeys that combine multiple topics.
          </p>
        </div>

        {paths.length === 0 ? (
          <div className={styles.emptyState}>
            <Image
              src="/sword_logo.png"
              alt="SWORD logo"
              width={40}
              height={40}
              className={styles.emptyIcon}
            />
            <p className={styles.empty}>
              No learning paths are available yet. Add paths in Supabase to see
              them here.
            </p>
          </div>
        ) : (
          <div className={styles.gridPaths}>
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
