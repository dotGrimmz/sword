import { redirect } from "next/navigation";

import { CommentsSection } from "@/components/pre-read/CommentsSection";
import { PollWidget } from "@/components/pre-read/PollWidget";
import { StreamHostCard } from "@/components/pre-read/StreamHostCard";
import { PRE_READ_SELECT } from "@/app/api/pre-reads/utils";
import { fetchPollSnapshot } from "@/lib/pre-read/poll";
import { createClient } from "@/lib/supabase/server";

import styles from "./PreReadPage.module.css";

export const dynamic = "force-dynamic";

const ensureStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
      .filter((entry) => entry.trim().length > 0);
  }
  return [];
};

const formatReference = (
  book: string,
  chapter: number,
  range: string | null,
) => `${book} ${chapter}${range ? `:${range}` : ""}`;

export default async function PreReadPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();

  const { data: preRead, error } = await supabase
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .eq("published", true)
    .eq("is_cancelled", false)
    .lte("visible_from", nowIso)
    .gte("visible_until", nowIso)
    .order("visible_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!preRead) {
    return (
      <main className={styles.page}>
        <section className={styles.fallback}>
          <p className={styles.heroEyebrow}>Pre-Read</p>
          <h1 className={styles.fallbackTitle}>No Study Scheduled Today</h1>
          <p className={styles.fallbackText}>
            Check back later for the next daily Pre-Read once it has been
            scheduled and published.
          </p>
        </section>
      </main>
    );
  }

  const reflectionQuestions = ensureStringArray(preRead.reflection_questions);

  const hasPoll =
    Array.isArray(preRead.poll_options) && preRead.poll_options.length >= 2;

  let pollSnapshot = null;
  if (hasPoll) {
    try {
      pollSnapshot = await fetchPollSnapshot({
        preReadId: preRead.id,
        optionCount: preRead.poll_options!.length,
        supabase,
        userId: session.user.id,
      });
    } catch (pollError) {
      console.error("Failed to fetch poll snapshot", pollError);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heroCard}>
        <p className={styles.heroEyebrow}>Today&apos;s Passage</p>
        <div>
          <h1 className={styles.heroTitle}>
            {preRead.book} {preRead.chapter}
          </h1>
          {preRead.verses_range ? (
            <p className={styles.heroSubtitle}>
              Verses {preRead.verses_range}
            </p>
          ) : null}
        </div>
        {preRead.host_profile ? (
          <StreamHostCard
            host={preRead.host_profile}
            streamStartTime={preRead.stream_start_time}
          />
        ) : null}
      </section>

      <section className={styles.section}>
        <p className={styles.sectionEyebrow}>Summary</p>
        <p className={styles.summaryText}>{preRead.summary}</p>
      </section>

      {preRead.memory_verse ? (
        <section className={styles.memoryCard}>
          <p className={styles.sectionEyebrow}>Memory Verse</p>
          <blockquote className={styles.memoryQuote}>
            “{preRead.memory_verse}”
          </blockquote>
          <p className={styles.memoryReference}>
            {formatReference(
              preRead.book,
              preRead.chapter,
              preRead.verses_range,
            )}
          </p>
        </section>
      ) : null}

      {reflectionQuestions.length > 0 ? (
        <section className={styles.section}>
          <p className={styles.sectionEyebrow}>Reflection Questions</p>
          <ol className={styles.reflectionList}>
            {reflectionQuestions.map((question, index) => (
              <li key={question} className={styles.reflectionItem}>
                <span className={styles.reflectionBadge}>Q{index + 1}</span>
                {question}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {hasPoll && preRead.poll_question ? (
        <PollWidget
          preReadId={preRead.id}
          question={preRead.poll_question}
          options={preRead.poll_options!}
          initialSnapshot={pollSnapshot}
          className={styles.section}
        />
      ) : null}

      <CommentsSection preReadId={preRead.id} className={styles.section} />
    </main>
  );
}
