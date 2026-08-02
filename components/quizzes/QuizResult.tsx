"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

import { citationToReaderHref } from "@/lib/quizzes/citation-href";
import type { QuizAttemptResult } from "@/types/quizzes";

import styles from "@/app/quizzes/QuizzesPage.module.css";

type QuizResultProps = {
  result: QuizAttemptResult;
  /** Quiz book used when a citation omits the book name. */
  fallbackBook?: string | null;
  onTryAgain?: () => void;
};

export function QuizResult({
  result,
  fallbackBook,
  onTryAgain,
}: QuizResultProps) {
  const percent = Math.round(
    (result.score / Math.max(result.maxScore, 1)) * 100,
  );
  const correctItems = result.results.filter((q) => q.correct);
  const missedItems = result.results.filter((q) => !q.correct);
  const showBest =
    result.bestScore !== result.score ||
    result.bestMaxScore !== result.maxScore;
  const canTryAgain =
    !result.finalized &&
    result.attemptsRemaining > 0 &&
    typeof onTryAgain === "function";

  const studyFocus =
    missedItems.length === 0
      ? "You answered every question correctly. Revisit the passage to seal it in."
      : missedItems.length === 1
        ? "One verse to revisit — open it in the reader and read the surrounding context."
        : `${missedItems.length} verses to revisit — start with these, then re-read the chapter.`;

  return (
    <div className={styles.takeStack}>
      <div className={styles.resultBanner}>
        <p className={styles.resultScore}>
          {result.score} / {result.maxScore}
        </p>
        <p className={styles.resultSub}>
          {percent}% correct this attempt · Attempt {result.attemptNumber} of{" "}
          {result.maxAttempts}
        </p>
        {showBest ? (
          <p className={styles.resultOfficial}>
            Official best: {result.bestScore} / {result.bestMaxScore} (
            {Math.round(result.bestPercent)}%)
          </p>
        ) : (
          <p className={styles.resultOfficial}>
            Official score: {result.bestScore} / {result.bestMaxScore}
          </p>
        )}
        {result.finalized ? (
          <p className={styles.resultLocked}>
            Attempts used up — your official score is locked.
          </p>
        ) : (
          <p className={styles.resultSub}>
            {result.attemptsRemaining}{" "}
            {result.attemptsRemaining === 1 ? "attempt" : "attempts"} left
          </p>
        )}
      </div>

      <section
        className={styles.studyReview}
        aria-labelledby="study-review-heading"
      >
        <p className={styles.eyebrow}>Study review</p>
        <h2 id="study-review-heading" className={styles.studyReviewTitle}>
          {correctItems.length} right · {missedItems.length} to review
        </h2>
        <p className={styles.studyReviewLead}>{studyFocus}</p>

        {missedItems.length > 0 ? (
          <ul className={styles.studyFocusList}>
            {missedItems.map((item) => {
              const href = citationToReaderHref(item.citation, fallbackBook);
              return (
                <li key={item.questionId} className={styles.studyFocusItem}>
                  <div className={styles.studyFocusText}>
                    <p className={styles.studyFocusPrompt}>{item.prompt}</p>
                    {item.citation ? (
                      <p className={styles.studyFocusCitation}>
                        {item.citation}
                      </p>
                    ) : null}
                  </div>
                  {href ? (
                    <Link href={href} className={styles.studyFocusLink}>
                      <BookOpen aria-hidden="true" size={16} />
                      Open verse
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {correctItems.length > 0 && missedItems.length > 0 ? (
          <p className={styles.studyReviewAside}>
            You also got {correctItems.length}{" "}
            {correctItems.length === 1 ? "question" : "questions"} right — nice
            work.
          </p>
        ) : null}
      </section>

      <div className={styles.reviewList}>
        {result.results.map((item) => {
          const href = citationToReaderHref(item.citation, fallbackBook);
          return (
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
                {item.correct ? "Correct" : "Incorrect"}
              </p>
              <p className={styles.reviewPrompt}>{item.prompt}</p>
              <p className={styles.reviewLine}>
                Your answer: {item.givenAnswer || "—"}
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
                href ? (
                  <Link href={href} className={styles.citationLink}>
                    <BookOpen aria-hidden="true" size={15} />
                    {item.citation}
                  </Link>
                ) : (
                  <p className={styles.reviewLine}>Citation: {item.citation}</p>
                )
              ) : null}
            </article>
          );
        })}
      </div>

      {canTryAgain ? (
        <button
          type="button"
          className={styles.submitButton}
          onClick={onTryAgain}
        >
          Try again
        </button>
      ) : null}

      <Link href="/quizzes" className={styles.secondaryLink}>
        Back to quizzes
      </Link>
    </div>
  );
}
