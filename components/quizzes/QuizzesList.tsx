import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { formatQuizPassageRef } from "@/lib/quizzes/strip";
import type { PublicQuizSummary } from "@/types/quizzes";

import styles from "@/app/quizzes/QuizzesPage.module.css";

type QuizzesListProps = {
  quizzes: PublicQuizSummary[];
};

export function QuizzesList({ quizzes }: QuizzesListProps) {
  if (quizzes.length === 0) {
    return (
      <p className={styles.empty}>
        No quizzes are available right now. Check back soon.
      </p>
    );
  }

  return (
    <div className={styles.list}>
      {quizzes.map((quiz) => (
        <Link
          key={quiz.id}
          href={`/quizzes/${quiz.id}`}
          className={styles.card}
        >
          <h2 className={styles.cardTitle}>{quiz.title}</h2>
          <p className={styles.cardMeta}>
            {formatQuizPassageRef(quiz)} · {quiz.translation_code}
          </p>
          <p className={styles.cardMeta}>
            {quiz.question_count}{" "}
            {quiz.question_count === 1 ? "question" : "questions"}
          </p>
          <span className={styles.cardCta}>
            Take quiz
            <ArrowUpRight aria-hidden="true" width={14} height={14} />
          </span>
        </Link>
      ))}
    </div>
  );
}
