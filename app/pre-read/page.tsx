import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen } from "lucide-react";
import { dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { AddMemoryVerseButton } from "@/components/pre-read/AddMemoryVerseButton";
import { CommentsSection } from "@/components/pre-read/CommentsSection";
import { PollWidget } from "@/components/pre-read/PollWidget";
import { StreamHostCard } from "@/components/pre-read/StreamHostCard";
import { StudyMaterialsList } from "@/components/pre-read/StudyMaterialsList";
import { fetchPollSnapshot } from "@/lib/pre-read/poll";
import { HydrateClient } from "@/lib/query/HydrateClient";
import { getQueryClient } from "@/lib/query/get-query-client";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import { fetchStudyMaterials } from "@/lib/study/loaders";
import { PRE_READ_SELECT } from "@/lib/study/normalize";
import { formatWeekLabel, startOfWeek } from "@/lib/study/week";
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

  const weekStart = startOfWeek(new Date());
  const queryClient = getQueryClient();

  const { data: study, error } = await supabase
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .eq("published", true)
    .eq("is_cancelled", false)
    .eq("week_start", weekStart)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!study) {
    return (
      <main className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} aria-hidden="true" />
            Today
          </Link>
          <p className={styles.brandMark}>SWORD</p>
        </div>
        <section className={styles.fallback}>
          <span className={styles.fallbackIconWrap} aria-hidden="true">
            <BookOpen className={styles.fallbackIcon} />
          </span>
          <h1 className={styles.fallbackTitle}>No study posted this week</h1>
          <p className={styles.fallbackText}>
            Check back soon—your leaders are preparing this week&apos;s prep.
          </p>
          <p className={styles.fallbackBrand}>SWORD</p>
        </section>
      </main>
    );
  }

  await queryClient.prefetchQuery({
    queryKey: queryKeys.studyMaterials(study.id),
    queryFn: () => fetchStudyMaterials(supabase, study.id),
    staleTime: STALE_TIMES.profile,
  });

  const reflectionQuestions = ensureStringArray(study.reflection_questions);

  const hasPoll =
    Array.isArray(study.poll_options) && study.poll_options.length >= 2;

  let pollSnapshot = null;
  if (hasPoll) {
    try {
      pollSnapshot = await fetchPollSnapshot({
        preReadId: study.id,
        optionCount: study.poll_options!.length,
        supabase,
        userId: session.user.id,
      });
    } catch (pollError) {
      console.error("Failed to fetch poll snapshot", pollError);
    }
  }

  const readerHref = `/dashboard/reader?book=${encodeURIComponent(
    study.book,
  )}&chapter=${study.chapter}`;

  const weekLabel = study.week_start
    ? formatWeekLabel(study.week_start)
    : formatWeekLabel(weekStart);

  const reference = formatReference(
    study.book,
    study.chapter,
    study.verses_range,
  );

  return (
    <HydrateClient state={dehydrate(queryClient)}>
      <main className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/dashboard" className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} aria-hidden="true" />
            Today
          </Link>
          <p className={styles.brandMark}>SWORD</p>
        </div>

        <section className={styles.hero}>
          <p className={styles.heroEyebrow}>
            This Week&apos;s Study · {weekLabel}
          </p>
          <h1 className={styles.heroTitle}>
            {study.title || `${study.book} ${study.chapter}`}
          </h1>
          <div className={styles.scriptureRow}>
            <p className={styles.scriptureRef}>{reference}</p>
            <Link href={readerHref} className={styles.heroLink}>
              Open in Reader
              <ArrowUpRight
                className={styles.heroLinkIcon}
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>

        {study.summary ? (
          <section className={styles.section}>
            <p className={styles.sectionEyebrow}>Summary</p>
            <p className={styles.summaryText}>{study.summary}</p>
          </section>
        ) : null}

        <StudyMaterialsList studyId={study.id} className={styles.section} />

        {study.memory_verse ? (
          <section className={styles.memoryCard}>
            <p className={styles.sectionEyebrow}>Memory Verse</p>
            <blockquote className={styles.memoryQuote}>
              “{study.memory_verse}”
            </blockquote>
            <p className={styles.memoryReference}>{reference}</p>
            <AddMemoryVerseButton
              book={study.book}
              chapter={study.chapter}
              versesRange={study.verses_range}
              memoryVerse={study.memory_verse}
              className={styles.memoryAction}
            />
          </section>
        ) : null}

        {reflectionQuestions.length > 0 ? (
          <section className={styles.sectionMuted}>
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

        {hasPoll && study.poll_question ? (
          <PollWidget
            preReadId={study.id}
            question={study.poll_question}
            options={study.poll_options!}
            initialSnapshot={pollSnapshot}
            className={styles.sectionMuted}
          />
        ) : null}

        <CommentsSection preReadId={study.id} className={styles.sectionMuted} />

        {study.host_profile ? (
          <section className={`${styles.section} ${styles.hostSection}`}>
            <div className={styles.sectionHeaderRow}>
              <p className={styles.sectionEyebrow}>Host</p>
              <p className={styles.sectionHelper}>Live stream details & bio</p>
            </div>
            <StreamHostCard
              host={study.host_profile}
              streamStartTime={study.stream_start_time}
            />
          </section>
        ) : null}
      </main>
    </HydrateClient>
  );
}
