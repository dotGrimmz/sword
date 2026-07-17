import Link from "next/link";
import { CalendarPlus, CalendarRange } from "lucide-react";

import { formatEventWhen, locationLabel } from "@/lib/church-events/format";
import { listAdminSeries } from "@/lib/church-events/loaders";
import { formatRecurrenceSummary } from "@/lib/church-events/recurrence";
import { createClient } from "@/lib/supabase/server";
import type { EventSeriesStatus } from "@/types/events";

import styles from "../AdminPage.module.css";

export const dynamic = "force-dynamic";

const getStatus = (status: EventSeriesStatus) => {
  if (status === "cancelled") {
    return { label: "Cancelled", className: styles.statusCancelled };
  }
  if (status === "published") {
    return { label: "Published", className: styles.statusPublished };
  }
  return { label: "Draft", className: styles.statusDraft };
};

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const series = await listAdminSeries(supabase);

  const published = series.filter((item) => item.status === "published").length;
  const withNext = series.filter((item) => item.next_occurrence).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Admin · Events</p>
        <h2 className={styles.title}>Events</h2>
        <p className={styles.description}>
          Publish gatherings for members and guests. Recurring series supported;
          RSVP comes later.
        </p>
      </header>

      <section className={styles.statsRow} aria-label="Event counts">
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Series</p>
          <p className={styles.statValue}>{series.length}</p>
          <p className={styles.statMeta}>Total templates</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Published</p>
          <p className={styles.statValue}>{published}</p>
          <p className={styles.statMeta}>Visible publicly</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Upcoming</p>
          <p className={styles.statValue}>{withNext}</p>
          <p className={styles.statMeta}>Have a next date</p>
        </div>
      </section>

      <section className={styles.primaryCta}>
        <div className={styles.primaryCtaCopy}>
          <p className={styles.primaryCtaEyebrow}>Primary action</p>
          <h3 className={styles.primaryCtaTitle}>Create an event</h3>
          <p className={styles.primaryCtaMeta}>
            Add a gathering with date, location, and optional recurrence.
          </p>
        </div>
        <Link href="/admin/events/new" className={styles.primaryCtaButton}>
          <CalendarPlus className={styles.primaryCtaIcon} aria-hidden="true" />
          Create event
        </Link>
      </section>

      {series.length === 0 ? (
        <div className={styles.emptyState}>
          <CalendarRange className={styles.emptyIcon} aria-hidden="true" />
          <p>No events yet. Create your first gathering above.</p>
        </div>
      ) : (
        <section className={styles.listStack} aria-label="All event series">
          {series.map((item) => {
            const status = getStatus(item.status);
            const next = item.next_occurrence;
            return (
              <article key={item.id} className={styles.listCard}>
                <div className={styles.listCardBody}>
                  <h3 className={styles.listCardTitle}>{item.title}</h3>
                  <p className={styles.listCardMeta}>
                    {next
                      ? `Next: ${formatEventWhen(next.starts_at, next.ends_at, item.timezone)}`
                      : "No upcoming occurrence"}
                    {" · "}
                    {locationLabel(
                      item.location_type,
                      item.venue,
                      item.address,
                    )}
                  </p>
                  <p className={styles.listCardSummary}>
                    {formatRecurrenceSummary(item)}
                  </p>
                </div>
                <div className={styles.listCardAside}>
                  <span
                    className={`${styles.statusBadge} ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <div className={styles.listCardActions}>
                    {item.status === "published" ? (
                      <Link
                        href={`/events/${item.id}`}
                        target="_blank"
                        className={styles.listCardLink}
                      >
                        View
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/events/${item.id}/edit`}
                      className={styles.listCardLink}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
