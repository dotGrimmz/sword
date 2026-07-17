import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarRange, QrCode } from "lucide-react";

import { fetchPreReads } from "@/lib/api/pre-reads";
import { formatWeekLabel, isCurrentWeek, startOfWeek } from "@/lib/study/week";

import styles from "./AdminPage.module.css";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const preReads = await fetchPreReads();

  const weekStart = startOfWeek(new Date());
  const thisWeekStudy =
    preReads.find(
      (study) => study.week_start && isCurrentWeek(study.week_start),
    ) ?? null;
  const publishedCount = preReads.filter((study) => study.published).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Admin Console</p>
        <h2 className={styles.title}>Overview</h2>
        <p className={styles.description}>
          Publish this week&apos;s study for your church. Jump into Study to add
          scripture and materials.
        </p>
      </header>

      <section className={styles.statsRow} aria-label="Quick counts">
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Studies</p>
          <p className={styles.statValue}>{preReads.length}</p>
          <p className={styles.statMeta}>{publishedCount} published</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>This week</p>
          <p className={styles.statValue}>
            {thisWeekStudy ? "Ready" : "Open"}
          </p>
          <p className={styles.statMeta}>{formatWeekLabel(weekStart)}</p>
        </div>
      </section>

      <section className={styles.primaryCta}>
        <div className={styles.primaryCtaCopy}>
          <p className={styles.primaryCtaEyebrow}>Primary action</p>
          <h3 className={styles.primaryCtaTitle}>
            {thisWeekStudy
              ? thisWeekStudy.title ||
                `${thisWeekStudy.book} ${thisWeekStudy.chapter}`
              : "Post this week's study"}
          </h3>
          <p className={styles.primaryCtaMeta}>
            {thisWeekStudy
              ? `${thisWeekStudy.book} ${thisWeekStudy.chapter}${
                  thisWeekStudy.verses_range
                    ? `:${thisWeekStudy.verses_range}`
                    : ""
                } · Edit topic, scripture, and materials`
              : "Create the topic, scripture, and materials members will see on Study."}
          </p>
        </div>
        <Link
          href={
            thisWeekStudy
              ? `/admin/pre-read/${thisWeekStudy.id}/edit`
              : "/admin/pre-read/new"
          }
          className={styles.primaryCtaButton}
        >
          {thisWeekStudy ? "Edit this week's study" : "Create study"}
          <ArrowRight className={styles.primaryCtaIcon} aria-hidden="true" />
        </Link>
      </section>

      <section className={styles.quickLinks}>
        <Link href="/admin/pre-read" className={styles.quickLink}>
          <CalendarDays className={styles.quickIcon} aria-hidden="true" />
          <span>
            <span className={styles.quickTitle}>Study</span>
            <span className={styles.quickMeta}>All studies & materials</span>
          </span>
        </Link>
        <Link href="/admin/qr-login" className={styles.quickLink}>
          <QrCode className={styles.quickIcon} aria-hidden="true" />
          <span>
            <span className={styles.quickTitle}>Login QR</span>
            <span className={styles.quickMeta}>Share production login</span>
          </span>
        </Link>
        <Link href="/admin/events" className={styles.quickLink}>
          <CalendarRange className={styles.quickIcon} aria-hidden="true" />
          <span>
            <span className={styles.quickTitle}>Events</span>
            <span className={styles.quickMeta}>Gatherings & recurrence</span>
          </span>
        </Link>
      </section>
    </main>
  );
}
