"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { submitQuizAttempt } from "@/lib/api/quizzes";
import { QuizResult } from "@/components/quizzes/QuizResult";
import type {
  PublicQuizDetail,
  PublicQuizQuestion,
  QuizAttemptResult,
} from "@/types/quizzes";

import styles from "@/app/quizzes/QuizzesPage.module.css";

type QuizTakeFormProps = {
  quiz: PublicQuizDetail;
};

export function QuizTakeForm({ quiz }: QuizTakeFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);

  const allAnswered = useMemo(
    () =>
      quiz.questions.every((q) => (answers[q.id] ?? "").trim().length > 0),
    [answers, quiz.questions],
  );

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || result) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = quiz.questions.map((q) => ({
        questionId: q.id,
        value: answers[q.id] ?? "",
      }));
      const { attempt } = await submitQuizAttempt(quiz.id, payload);
      setResult(attempt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return <QuizResult result={result} />;
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
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
        <div className={styles.options} role="radiogroup" aria-label={`Question ${index + 1}`}>
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
