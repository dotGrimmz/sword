import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { fetchTranslations } from "@/lib/bible/loaders";
import { getAdminQuiz } from "@/lib/quizzes/loaders";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import pageStyles from "../../../AdminPage.module.css";
import QuizForm from "../../QuizForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditQuizPage({ params }: PageProps) {
  const { id } = await params;
  const userClient = await createClient();
  const adminClient = getServiceRoleClient();
  const [quiz, translations] = await Promise.all([
    getAdminQuiz(adminClient, id),
    fetchTranslations(userClient).catch(() => []),
  ]);

  if (!quiz) notFound();

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.backRow}>
        <Link href="/admin/quizzes" className={pageStyles.backLink}>
          <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
          Back to quizzes
        </Link>
        <Link
          href={`/admin/quizzes/${quiz.id}/scores`}
          className={pageStyles.backLink}
        >
          View scores
        </Link>
      </div>
      <header className={pageStyles.header}>
        <p className={pageStyles.eyebrow}>Admin · Quizzes</p>
        <h2 className={pageStyles.title}>Edit quiz</h2>
        <p className={pageStyles.description}>{quiz.title}</p>
      </header>
      <QuizForm
        mode="edit"
        initialQuiz={quiz}
        translations={translations}
      />
    </main>
  );
}
