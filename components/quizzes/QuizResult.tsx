import Link from "next/link";

import type { QuizAttemptResult } from "@/types/quizzes";

import styles from "@/app/quizzes/QuizzesPage.module.css";

type QuizResultProps = {
  result: QuizAttemptResult;
};

export function QuizResult({ result }: QuizResultProps) {
  const percent =
    result.maxScore > 0
      ? Math.round((result.score / result.maxScore) * 100)
      : 0;

  return (
    <div className={styles.form}>
      <div className={styles.resultBanner}>
        <p className={styles.resultScore}>
          {result.score} / {result.maxScore}
        </p>
        <p className={styles.resultSub}>
          You scored {percent}%. Review your answers below.
        </p>
      </div>

      <div className={styles.reviewList}>
        {result.results.map((item, index) => (
          <article
            key={item.questionId}
            className={`${styles.reviewItem} ${
              item.correct
                ? styles.reviewItemCorrect
                : styles.reviewItemIncorrect
            }`}
          >
            <p
              className={`${styles.reviewBadge} ${
                item.correct
                  ? styles.reviewBadgeCorrect
                  : styles.reviewBadgeIncorrect
              }`}
            >
              {item.correct ? "Correct" : "Incorrect"} · Q{index + 1}
            </p>
            <p className={styles.reviewPrompt}>{item.prompt}</p>
            <p className={styles.reviewLine}>
              Your answer: {item.givenAnswer.trim() || "(blank)"}
            </p>
            {!item.correct ? (
              <p className={styles.reviewLine}>
                Correct answer: {item.correctAnswer}
              </p>
            ) : null}
            {item.explanation ? (
              <p className={styles.reviewLine}>{item.explanation}</p>
            ) : null}
            {item.citation ? (
              <p className={styles.reviewLine}>{item.citation}</p>
            ) : null}
          </article>
        ))}
      </div>

      <Link href="/quizzes" className={styles.secondaryLink}>
        Back to quizzes
      </Link>
    </div>
  );
}
