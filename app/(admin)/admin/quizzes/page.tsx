import Link from "next/link";
import { ClipboardList, ClipboardPlus } from "lucide-react";

import { listAdminQuizzes } from "@/lib/quizzes/loaders";
import { getServiceRoleClient } from "@/lib/supabase/admin";

import styles from "../AdminPage.module.css";
import QuizzesList from "./QuizzesList";

export const dynamic = "force-dynamic";

export default async function AdminQuizzesPage() {
  const supabase = getServiceRoleClient();
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
          <p className={styles.statMeta}>Visible to members</p>
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
        <QuizzesList quizzes={quizzes} />
      )}
    </main>
  );
}
