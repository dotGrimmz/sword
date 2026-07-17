import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { getPublicSeries } from "@/lib/church-events/loaders";
import { formatEventWhen, locationLabel } from "@/lib/church-events/format";
import { formatRecurrenceSummary } from "@/lib/church-events/recurrence";
import { createClient } from "@/lib/supabase/server";

import styles from "../EventsPage.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const series = await getPublicSeries(supabase, id);
  if (!series) return { title: "Event | SWORD" };
  return {
    title: `${series.title} | SWORD`,
    description: series.description ?? "Church event details",
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const series = await getPublicSeries(supabase, id);
  if (!series) notFound();

  const next = series.next_occurrence;
  const schedule = series.occurrences.filter(
    (occ) => new Date(occ.starts_at).getTime() >= Date.now(),
  );

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/events" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} aria-hidden="true" />
          All events
        </Link>
        <p className={styles.brandMark}>SWORD</p>
      </div>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Event</p>
        <h1 className={styles.title}>{series.title}</h1>
        {series.description ? (
          <p className={styles.subtitle}>{series.description}</p>
        ) : null}
      </header>

      {series.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={series.cover_url} alt="" className={styles.cover} />
      ) : null}

      <section className={styles.detailBlock}>
        <div>
          <p className={styles.detailLabel}>When</p>
          <p className={styles.detailValue}>
            {next
              ? formatEventWhen(next.starts_at, next.ends_at, series.timezone)
              : "No upcoming dates"}
          </p>
          <p className={styles.detailBody}>
            {formatRecurrenceSummary(series)}
          </p>
        </div>
        <div>
          <p className={styles.detailLabel}>Where</p>
          <p className={styles.detailValue}>
            {locationLabel(
              series.location_type,
              series.venue,
              series.address,
            )}
          </p>
          {series.address && series.venue ? (
            <p className={styles.detailBody}>{series.address}</p>
          ) : null}
        </div>

        <div className={styles.actions}>
          {series.join_url ? (
            <a
              href={series.join_url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.cta}
            >
              Join / open stream
              <ExternalLink width={16} height={16} aria-hidden="true" />
            </a>
          ) : null}
          {series.pre_read_id ? (
            <Link href="/pre-read" className={styles.ctaSecondary}>
              This week&apos;s study
              <ArrowUpRight width={14} height={14} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </section>

      {schedule.length > 1 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Upcoming dates</h2>
          <div className={styles.detailBlock}>
            {schedule.slice(0, 12).map((occ) => (
              <p key={occ.id} className={styles.scheduleItem}>
                {formatEventWhen(occ.starts_at, occ.ends_at, series.timezone)}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
