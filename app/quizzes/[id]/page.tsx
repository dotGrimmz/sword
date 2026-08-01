import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { QuizTakeForm } from "@/components/quizzes/QuizTakeForm";
import { getPublishedQuizForTake } from "@/lib/quizzes/member-loaders";
import { formatQuizPassageRef } from "@/lib/quizzes/strip";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import styles from "../QuizzesPage.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const admin = getServiceRoleClient();
    const quiz = await getPublishedQuizForTake(admin, id);
    if (!quiz) return { title: "Quiz | SWORD" };
    return { title: `${quiz.title} | SWORD` };
  } catch {
    return { title: "Quiz | SWORD" };
  }
}

export default async function QuizTakePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const admin = getServiceRoleClient();
  const quiz = await getPublishedQuizForTake(admin, id);
  if (!quiz) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link href="/quizzes" className={styles.backLink}>
          <ArrowLeft className={styles.backIcon} aria-hidden="true" />
          Quizzes
        </Link>
        <p className={styles.brandMark}>SWORD</p>
      </div>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Quiz</p>
        <h1 className={styles.title}>{quiz.title}</h1>
        <p className={styles.metaRow}>
          <span>{formatQuizPassageRef(quiz)}</span>
          <span>{quiz.translation_code}</span>
          <span>
            {quiz.question_count}{" "}
            {quiz.question_count === 1 ? "question" : "questions"}
          </span>
        </p>
      </header>

      <QuizTakeForm quiz={quiz} />
    </main>
  );
}
