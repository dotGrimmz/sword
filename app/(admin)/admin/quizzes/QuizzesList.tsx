"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setAdminQuizStatus } from "@/lib/api/admin-quizzes";
import { ApiError } from "@/lib/api/fetch";
import type { Quiz, QuizStatus } from "@/types/quizzes";

import styles from "../AdminPage.module.css";

type QuizzesListProps = {
  quizzes: Quiz[];
};

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

export default function QuizzesList({ quizzes }: QuizzesListProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handlePublish = async (quiz: Quiz) => {
    if (quiz.question_count < 1) {
      toast.error("Add at least one question before publishing");
      return;
    }

    setPendingId(quiz.id);
    try {
      await setAdminQuizStatus(quiz.id, "published");
      toast.success(`Published “${quiz.title}”`);
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof ApiError ? error.message : "Failed to publish quiz";
      toast.error(message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className={styles.listStack} aria-label="All quizzes">
      {quizzes.map((quiz) => {
        const status = getStatus(quiz.status);
        const publishing = pendingId === quiz.id;
        const canPublish = quiz.status !== "published";

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
              <span className={`${styles.statusBadge} ${status.className}`}>
                {status.label}
              </span>
              <div className={styles.listCardActions}>
                {canPublish ? (
                  <button
                    type="button"
                    className={styles.listCardButton}
                    disabled={publishing || pendingId !== null}
                    onClick={() => void handlePublish(quiz)}
                  >
                    {publishing ? "Publishing…" : "Publish"}
                  </button>
                ) : null}
                <Link
                  href={`/admin/quizzes/${quiz.id}/scores`}
                  className={styles.listCardLink}
                >
                  Scores
                </Link>
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
  );
}
