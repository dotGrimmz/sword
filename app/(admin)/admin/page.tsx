import Link from "next/link";
import { ArrowLeft, CalendarDays, Users2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchHostProfiles, fetchPreReads } from "@/lib/api/pre-reads";

import styles from "./AdminPage.module.css";

export const dynamic = "force-dynamic";

const cards = [
  {
    name: "Pre-Reads",
    description: "Daily study schedule, polls, and visibility.",
    href: "/admin/pre-read",
    icon: CalendarDays,
    toneClass: "tonePreReads",
  },
  {
    name: "Hosts",
    description: "Manage livestream hosts and metadata.",
    href: "/admin/hosts",
    icon: Users2,
    toneClass: "toneHosts",
  },
];

export default async function AdminOverviewPage() {
  const [preReads, hosts] = await Promise.all([
    fetchPreReads(),
    fetchHostProfiles(),
  ]);

  const counts = {
    "Pre-Reads": preReads.length,
    Hosts: hosts.length,
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
        <h1 className={styles.title}>Pre-Read Management</h1>
        <p className={styles.description}>
          Plan daily studies and curate host metadata. Use the panels below to
          schedule Pre-Reads and manage active hosts.
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
