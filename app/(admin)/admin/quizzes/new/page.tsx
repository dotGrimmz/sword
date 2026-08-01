import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { fetchTranslations } from "@/lib/bible/loaders";
import { createClient } from "@/lib/supabase/server";

import pageStyles from "../../AdminPage.module.css";
import QuizForm from "../QuizForm";

export const dynamic = "force-dynamic";

export default async function AdminNewQuizPage() {
  const supabase = await createClient();
  const translations = await fetchTranslations(supabase).catch(() => []);

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.backRow}>
        <Link href="/admin/quizzes" className={pageStyles.backLink}>
          <ArrowLeft className={pageStyles.backIcon} aria-hidden="true" />
          Back to quizzes
        </Link>
      </div>
      <header className={pageStyles.header}>
        <p className={pageStyles.eyebrow}>Admin · Quizzes</p>
        <h2 className={pageStyles.title}>New quiz</h2>
        <p className={pageStyles.description}>
          Generate from a passage or build questions manually, then save.
        </p>
      </header>
      <QuizForm mode="create" translations={translations} />
    </main>
  );
}
