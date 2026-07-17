import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";

import {
  listPastOccurrences,
  listUpcomingOccurrences,
} from "@/lib/church-events/loaders";
import { formatEventWhen, locationLabel } from "@/lib/church-events/format";
import { createClient } from "@/lib/supabase/server";

import styles from "./EventsPage.module.css";

export const metadata: Metadata = {
  title: "Events | SWORD",
  description: "Upcoming gatherings with Realign Ministries.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ past?: string }>;
};

export default async function EventsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const showPast = params.past === "1";
  const supabase = await createClient();
  const events = showPast
    ? await listPastOccurrences(supabase, 20)
    : await listUpcomingOccurrences(supabase);

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/dashboard" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} aria-hidden="true" />
          Back
        </Link>
        <p className={styles.brandMark}>SWORD</p>
      </div>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Realign Ministries</p>
        <h1 className={styles.title}>Events</h1>
        <p className={styles.subtitle}>
          See what&apos;s coming up — join us in person or online.
        </p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Event lists">
        <Link
          href="/events"
          className={showPast ? styles.tab : styles.tabActive}
          aria-current={showPast ? undefined : "page"}
        >
          Upcoming
        </Link>
        <Link
          href="/events?past=1"
          className={showPast ? styles.tabActive : styles.tab}
          aria-current={showPast ? "page" : undefined}
        >
          Past
        </Link>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {showPast ? "Past gatherings" : "Coming up"}
        </h2>
        {events.length === 0 ? (
          <p className={styles.empty}>
            {showPast
              ? "No past events to show yet."
              : "No upcoming events right now. Check back soon."}
          </p>
        ) : (
          <div className={styles.list}>
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.series_id}`}
                className={styles.card}
              >
                {event.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.cover_url}
                    alt=""
                    className={styles.cardCover}
                  />
                ) : null}
                <p className={styles.cardTitle}>{event.title}</p>
                <p className={styles.cardMeta}>
                  {formatEventWhen(
                    event.starts_at,
                    event.ends_at,
                    event.timezone,
                  )}
                </p>
                <p className={styles.cardMeta}>
                  {locationLabel(
                    event.location_type,
                    event.venue,
                    event.address,
                  )}
                </p>
                <span className={styles.cardCta}>
                  View details
                  <ArrowUpRight width={14} height={14} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
