"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { submitQuizAttempt } from "@/lib/api/quizzes";
import { QuizResult } from "@/components/quizzes/QuizResult";
import type {
  PublicQuizDetail,
  PublicQuizQuestion,
  QuizAttemptProgress,
  QuizAttemptResult,
} from "@/types/quizzes";

import styles from "@/app/quizzes/QuizzesPage.module.css";

type QuizTakeFormProps = {
  quiz: PublicQuizDetail;
  initialProgress: QuizAttemptProgress;
  /** When attempts are exhausted on load, show this locked review. */
  lockedResult?: QuizAttemptResult | null;
};

export function QuizTakeForm({
  quiz,
  initialProgress,
  lockedResult = null,
}: QuizTakeFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAttemptResult | null>(
    lockedResult && initialProgress.finalized ? lockedResult : null,
  );
  const [progress, setProgress] = useState<QuizAttemptProgress>(initialProgress);

  const allAnswered = useMemo(
    () =>
      quiz.questions.every((q) => (answers[q.id] ?? "").trim().length > 0),
    [answers, quiz.questions],
  );

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleTryAgain = () => {
    if (progress.finalized || progress.attemptsRemaining <= 0) return;
    setResult(null);
    setAnswers({});
    setError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || result || progress.finalized) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        value: answers[q.id] ?? "",
      }));
      const { attempt } = await submitQuizAttempt(quiz.id, payload);
      setResult(attempt);
      setProgress((prev) => ({
        attemptCount: attempt.attemptNumber,
        maxAttempts: attempt.maxAttempts,
        attemptsRemaining: attempt.attemptsRemaining,
        bestScore: attempt.bestScore,
        bestMaxScore: attempt.bestMaxScore,
        bestPercent: attempt.bestPercent,
        finalized: attempt.finalized,
        bestAttemptId:
          attempt.score > (prev.bestScore ?? -1)
            ? attempt.attemptId
            : (prev.bestAttemptId ?? attempt.attemptId),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <QuizResult
        result={result}
        fallbackBook={quiz.book}
        onTryAgain={handleTryAgain}
      />
    );
  }

  if (progress.finalized) {
    return (
      <div className={styles.takeStack}>
        <div className={styles.resultBanner}>
          <p className={styles.resultScore}>
            {progress.bestScore ?? 0} / {progress.bestMaxScore ?? quiz.question_count}
          </p>
          <p className={styles.resultOfficial}>
            Official score locked after {progress.attemptCount} of{" "}
            {progress.maxAttempts} attempts
          </p>
          <p className={styles.resultLocked}>
            No attempts remaining for this quiz.
          </p>
        </div>
        <Link href="/quizzes" className={styles.secondaryLink}>
          Back to quizzes
        </Link>
      </div>
    );
  }

  const nextAttemptNumber = progress.attemptCount + 1;

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <p className={styles.attemptMeta}>
        Attempt {nextAttemptNumber} of {progress.maxAttempts}
        {progress.bestScore != null && progress.bestMaxScore != null
          ? ` · Best so far: ${progress.bestScore}/${progress.bestMaxScore}`
          : null}
      </p>

      {quiz.questions.map((question, index) => (
        <QuestionField
          key={question.id}
          question={question}
          index={index}
          value={answers[question.id] ?? ""}
          disabled={submitting}
          onChange={(value) => setAnswer(question.id, value)}
        />
      ))}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={submitting || !allAnswered}
        >
          {submitting ? (
            <>
              <Loader2 className="animate-spin" width={18} height={18} />
              Submitting…
            </>
          ) : (
            "Submit answers"
          )}
        </button>
      </div>
    </form>
  );
}

type QuestionFieldProps = {
  question: PublicQuizQuestion;
  index: number;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function QuestionField({
  question,
  index,
  value,
  disabled,
  onChange,
}: QuestionFieldProps) {
  const options =
    question.type === "true_false"
      ? question.options ?? ["True", "False"]
      : question.options;

  return (
    <fieldset className={styles.questionBlock} disabled={disabled}>
      <legend className={styles.questionIndex}>Question {index + 1}</legend>
      <p className={styles.prompt}>{question.prompt}</p>
      {question.citation ? (
        <p className={styles.citation}>{question.citation}</p>
      ) : null}

      {question.type === "short_answer" || !options || options.length === 0 ? (
        <input
          className={styles.textInput}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
          autoComplete="off"
        />
      ) : (
        <div
          className={styles.options}
          role="radiogroup"
          aria-label={`Question ${index + 1}`}
        >
          {options.map((option) => {
            const selected = value === option;
            return (
              <label
                key={option}
                className={`${styles.option} ${
                  selected ? styles.optionSelected : ""
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={selected}
                  onChange={() => onChange(option)}
                />
                <span className={styles.optionLabel}>{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
