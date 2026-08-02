import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  listAdminQuizScores,
  summarizeAdminQuizScores,
} from "@/lib/quizzes/admin-scores";
import { formatQuizPassageRef } from "@/lib/quizzes/strip";
import { getServiceRoleClient } from "@/lib/supabase/admin";

import pageStyles from "../../../AdminPage.module.css";
import QuizScoresPanel from "../../QuizScoresPanel";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminQuizScoresPage({ params }: PageProps) {
  const { id } = await params;
  const admin = getServiceRoleClient();
  const result = await listAdminQuizScores(admin, id);

  if (!result) notFound();

  const { quiz, scores } = result;
  const summary = summarizeAdminQuizScores(scores);

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.backRow}>
        <Link href="/admin/quizzes" className={pageStyles.backLink}>
          <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
          Back to quizzes
        </Link>
        <Link
          href={`/admin/quizzes/${quiz.id}/edit`}
          className={pageStyles.backLink}
        >
          Edit quiz
        </Link>
      </div>

      <header className={pageStyles.header}>
        <p className={pageStyles.eyebrow}>Admin · Quizzes</p>
        <h2 className={pageStyles.title}>Scores</h2>
        <p className={pageStyles.description}>{quiz.title}</p>
        <p className={pageStyles.description}>
          {formatQuizPassageRef(quiz)} · {quiz.translation_code} ·{" "}
          {quiz.question_count}{" "}
          {quiz.question_count === 1 ? "question" : "questions"} ·{" "}
          {quiz.max_attempts}{" "}
          {quiz.max_attempts === 1 ? "attempt" : "attempts"} max
        </p>
      </header>

      <QuizScoresPanel
        quizId={quiz.id}
        scores={scores}
        summary={summary}
      />
    </main>
  );
}
