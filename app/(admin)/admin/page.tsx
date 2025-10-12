import Link from "next/link";
import { ArrowLeft, BookMarked, ListChecks, Route } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchPaths,
  fetchSources,
  fetchTopics,
} from "@/lib/api/apologetics";

import styles from "./AdminPage.module.css";

export const dynamic = "force-dynamic";

const cards = [
  {
    name: "Topics",
    description: "Core objections, claims, and curated evidence.",
    href: "/admin/topics",
    icon: BookMarked,
    toneClass: "toneTopics",
  },
  {
    name: "Paths",
    description: "Learning journeys that sequence multiple topics.",
    href: "/admin/paths",
    icon: Route,
    toneClass: "tonePaths",
  },
  {
    name: "Sources",
    description: "Supporting references and recommended reading.",
    href: "/admin/sources",
    icon: ListChecks,
    toneClass: "toneSources",
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
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.backRow}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
        <p className={styles.eyebrow}>Admin Console</p>
        <h1 className={styles.title}>Apologetics Management</h1>
        <p className={styles.description}>
          Create, edit, and curate apologetics content for the SWORD community.
          Use the panels below to manage topics, learning paths, and supporting
          sources.
        </p>
      </header>

      <section className={styles.cardsGrid}>
        {cards.map((card) => {
          const Icon = card.icon;
          const total = counts[card.name as keyof typeof counts] ?? 0;

          return (
            <Card key={card.name} className={styles.card}>
              <div
                className={`${styles.cardGradient} ${styles[card.toneClass]}`}
                aria-hidden="true"
              />
              <CardHeader className={styles.cardHeader}>
                <div className={styles.cardMeta}>
                  <span className={styles.cardMetaBadge}>
                    <Icon size={16} aria-hidden="true" />
                    {card.name}
                  </span>
                  <span className={styles.cardCount}>{total}</span>
                </div>
                <CardTitle className={styles.cardTitle}>
                  {card.description}
                </CardTitle>
              </CardHeader>
              <CardContent className={styles.cardContent}>
                <Link href={card.href} className={styles.cardLink}>
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
