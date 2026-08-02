import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { QuizzesList } from "@/components/quizzes/QuizzesList";
import { listPublishedQuizzes } from "@/lib/quizzes/member-loaders";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import styles from "./QuizzesPage.module.css";

export const metadata: Metadata = {
  title: "Quizzes | SWORD",
  description: "Take scripture quizzes from Realign Ministries.",
};

export const dynamic = "force-dynamic";

export default async function QuizzesPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const admin = getServiceRoleClient();
  const quizzes = await listPublishedQuizzes(admin, session.user.id);

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
        <p className={styles.eyebrow}>Scripture practice</p>
        <h1 className={styles.title}>Quizzes</h1>
        <p className={styles.subtitle}>
          Test what you&apos;ve been studying — answer, submit, and review.
        </p>
      </header>

      <section className={styles.section} aria-label="Available quizzes">
        <QuizzesList quizzes={quizzes} />
      </section>
    </main>
  );
}
