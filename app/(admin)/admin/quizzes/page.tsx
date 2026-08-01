import Link from "next/link";
import { ClipboardList, ClipboardPlus } from "lucide-react";

import { listAdminQuizzes } from "@/lib/quizzes/loaders";
import { createClient } from "@/lib/supabase/server";
import type { QuizStatus } from "@/types/quizzes";

import styles from "../AdminPage.module.css";

export const dynamic = "force-dynamic";

const formatRange = (
  book: string,
  startChapter: number,
  startVerse: number,
  endChapter: number,
  endVerse: number,
) => {
  if (startChapter === endChapter && startVerse === endVerse) {
    return `${book} ${startChapter}:${startVerse}`;
  }
  if (startChapter === endChapter) {
    return `${book} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
};

const getStatus = (status: QuizStatus) => {
  if (status === "published") {
    return { label: "Published", className: styles.statusPublished };
  }
  if (status === "archived") {
    return { label: "Archived", className: styles.statusCancelled };
  }
  return { label: "Draft", className: styles.statusDraft };
};

export default async function AdminQuizzesPage() {
  const supabase = await createClient();
  const quizzes = await listAdminQuizzes(supabase);

  const published = quizzes.filter((item) => item.status === "published").length;
  const drafts = quizzes.filter((item) => item.status === "draft").length;
  const archived = quizzes.filter((item) => item.status === "archived").length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Admin · Quizzes</p>
        <h2 className={styles.title}>Quizzes</h2>
        <p className={styles.description}>
          Generate scripture quizzes from a passage, edit questions, and publish
          for members.
        </p>
      </header>

      <section className={styles.statsRow} aria-label="Quiz counts">
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total</p>
          <p className={styles.statValue}>{quizzes.length}</p>
          <p className={styles.statMeta}>All quizzes</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Draft</p>
          <p className={styles.statValue}>{drafts}</p>
          <p className={styles.statMeta}>Not published</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Published</p>
          <p className={styles.statValue}>{published}</p>
          <p className={styles.statMeta}>Visible when assigned</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Archived</p>
          <p className={styles.statValue}>{archived}</p>
          <p className={styles.statMeta}>Retired</p>
        </div>
      </section>

      <section className={styles.primaryCta}>
        <div className={styles.primaryCtaCopy}>
          <p className={styles.primaryCtaEyebrow}>Primary action</p>
          <h3 className={styles.primaryCtaTitle}>Create a quiz</h3>
          <p className={styles.primaryCtaMeta}>
            Pick a passage, generate questions with AI, then edit and save.
          </p>
        </div>
        <Link href="/admin/quizzes/new" className={styles.primaryCtaButton}>
          <ClipboardPlus className={styles.primaryCtaIcon} aria-hidden="true" />
          Create quiz
        </Link>
      </section>

      {quizzes.length === 0 ? (
        <div className={styles.emptyState}>
          <ClipboardList className={styles.emptyIcon} aria-hidden="true" />
          <p>No quizzes yet. Create your first quiz above.</p>
        </div>
      ) : (
        <section className={styles.listStack} aria-label="All quizzes">
          {quizzes.map((quiz) => {
            const status = getStatus(quiz.status);
            return (
              <article key={quiz.id} className={styles.listCard}>
                <div className={styles.listCardBody}>
                  <h3 className={styles.listCardTitle}>{quiz.title}</h3>
                  <p className={styles.listCardMeta}>
                    {formatRange(
                      quiz.book,
                      quiz.start_chapter,
                      quiz.start_verse,
                      quiz.end_chapter,
                      quiz.end_verse,
                    )}
                    {" · "}
                    {quiz.translation_code}
                  </p>
                  <p className={styles.listCardSummary}>
                    {quiz.question_count} question
                    {quiz.question_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className={styles.listCardAside}>
                  <span
                    className={`${styles.statusBadge} ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <div className={styles.listCardActions}>
                    <Link
                      href={`/admin/quizzes/${quiz.id}/edit`}
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
