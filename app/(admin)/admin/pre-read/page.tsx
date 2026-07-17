import Link from "next/link";
import { ArrowRight, CalendarPlus, FileText } from "lucide-react";

import { fetchPreReads } from "@/lib/api/pre-reads";
import { formatWeekLabel, isCurrentWeek } from "@/lib/study/week";
import type { PreRead } from "@/types/pre-read";

import styles from "../AdminPage.module.css";

export const dynamic = "force-dynamic";

const getStatus = (study: PreRead) => {
  if (study.is_cancelled) {
    return { label: "Cancelled", className: styles.statusCancelled };
  }
  if (!study.published) {
    return { label: "Draft", className: styles.statusDraft };
  }
  if (study.week_start && isCurrentWeek(study.week_start)) {
    return { label: "Live", className: styles.statusLive };
  }
  if (study.week_start) {
    const weekStartMs = new Date(`${study.week_start}T12:00:00`).getTime();
    if (weekStartMs > Date.now()) {
      return { label: "Scheduled", className: styles.statusScheduled };
    }
    return { label: "Past", className: styles.statusPast };
  }
  return { label: "Published", className: styles.statusPublished };
};

export default async function AdminPreReadListPage() {
  const studies = await fetchPreReads();
  const thisWeek =
    studies.find(
      (study) => study.week_start && isCurrentWeek(study.week_start),
    ) ?? null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Admin · Study</p>
        <h2 className={styles.title}>Studies</h2>
        <p className={styles.description}>
          Post this week&apos;s topic, scripture, and downloadable materials for
          members.
        </p>
      </header>

      <section className={styles.primaryCta}>
        <div className={styles.primaryCtaCopy}>
          <p className={styles.primaryCtaEyebrow}>Primary action</p>
          <h3 className={styles.primaryCtaTitle}>
            {thisWeek
              ? thisWeek.title || `${thisWeek.book} ${thisWeek.chapter}`
              : "Create a study"}
          </h3>
          <p className={styles.primaryCtaMeta}>
            {thisWeek
              ? "Edit this week’s study and materials for the member hub."
              : "Add topic, scripture, and materials for this week."}
          </p>
        </div>
        <Link
          href={
            thisWeek
              ? `/admin/pre-read/${thisWeek.id}/edit`
              : "/admin/pre-read/new"
          }
          className={styles.primaryCtaButton}
        >
          {thisWeek ? (
            <>
              Edit this week
              <ArrowRight className={styles.primaryCtaIcon} aria-hidden="true" />
            </>
          ) : (
            <>
              <CalendarPlus className={styles.primaryCtaIcon} aria-hidden="true" />
              Create study
            </>
          )}
        </Link>
      </section>

      {studies.length === 0 ? (
        <div className={styles.emptyState}>
          <FileText className={styles.emptyIcon} aria-hidden="true" />
          <p>No studies yet. Create your first study above.</p>
        </div>
      ) : (
        <section className={styles.listStack} aria-label="All studies">
          {studies.map((study) => {
            const status = getStatus(study);
            return (
              <article key={study.id} className={styles.listCard}>
                <div className={styles.listCardBody}>
                  <h3 className={styles.listCardTitle}>
                    {study.title || `${study.book} ${study.chapter}`}
                  </h3>
                  <p className={styles.listCardMeta}>
                    {study.book} {study.chapter}
                    {study.verses_range ? `:${study.verses_range}` : ""}
                    {study.week_start
                      ? ` · ${formatWeekLabel(study.week_start)}`
                      : ""}
                  </p>
                  {study.summary ? (
                    <p className={styles.listCardSummary}>{study.summary}</p>
                  ) : null}
                </div>
                <div className={styles.listCardAside}>
                  <span
                    className={`${styles.statusBadge} ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <Link
                    href={`/admin/pre-read/${study.id}/edit`}
                    className={styles.listCardLink}
                  >
                    Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
