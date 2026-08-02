"use client";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import type { QuizQuestion, QuizQuestionType } from "@/types/quizzes";

import styles from "./QuizForm.module.css";

type QuizQuestionsEditorProps = {
  questions: QuizQuestion[];
  disabled?: boolean;
  onChange: (questions: QuizQuestion[]) => void;
};

const QUESTION_TYPES: {
  value: QuizQuestionType;
  label: string;
  description: string;
}[] = [
  {
    value: "multiple_choice",
    label: "Multiple choice",
    description: "One correct option among several choices.",
  },
  {
    value: "true_false",
    label: "True / false",
    description: "Statement judged as True or False.",
  },
  {
    value: "short_answer",
    label: "Short answer",
    description: "Free-text answer matched to an expected response.",
  },
];

const TRUE_FALSE_OPTIONS = [
  { value: "True", label: "True" },
  { value: "False", label: "False" },
];

const controlClass = `${styles.control} w-full min-w-0 max-w-full`;

const btnSecondary =
  "h-14 min-h-14 px-5 text-base md:h-11 md:min-h-11 md:px-4 md:text-sm border-[#e0c4b6] bg-white text-[#1a1a1a] hover:border-[#d91f26] hover:bg-[#d91f26]/10 hover:text-[#d91f26] cursor-pointer";
const btnDanger =
  "h-14 min-h-14 px-4 text-base md:h-10 md:min-h-10 md:px-3 md:text-sm border-[#e0c4b6] bg-white text-[#d91f26] hover:border-[#d91f26] hover:bg-[#d91f26]/10 cursor-pointer";

const newQuestionId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const blankQuestion = (): QuizQuestion => ({
  id: newQuestionId(),
  type: "multiple_choice",
  prompt: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  citation: null,
  explanation: null,
});

export default function QuizQuestionsEditor({
  questions,
  disabled = false,
  onChange,
}: QuizQuestionsEditorProps) {
  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    onChange(
      questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    );
  };

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    onChange([...questions, blankQuestion()]);
  };

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string,
  ) => {
    const question = questions[questionIndex];
    const options = [...(question.options ?? [])];
    options[optionIndex] = value;
    updateQuestion(questionIndex, { options });
  };

  const addOption = (questionIndex: number) => {
    const question = questions[questionIndex];
    const options = [...(question.options ?? []), ""];
    updateQuestion(questionIndex, { options });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = questions[questionIndex];
    const options = (question.options ?? []).filter((_, i) => i !== optionIndex);
    updateQuestion(questionIndex, { options });
  };

  const handleTypeChange = (index: number, type: QuizQuestionType) => {
    const question = questions[index];
    if (type === "multiple_choice") {
      updateQuestion(index, {
        type,
        options:
          question.options && question.options.length > 0
            ? question.options
            : ["", "", "", ""],
      });
      return;
    }
    if (type === "true_false") {
      updateQuestion(index, {
        type,
        options: ["True", "False"],
        correctAnswer:
          question.correctAnswer === "True" ||
          question.correctAnswer === "False"
            ? question.correctAnswer
            : "True",
      });
      return;
    }
    updateQuestion(index, { type, options: null });
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Questions</p>
          <h3 className={styles.sectionTitle}>
            {questions.length} question{questions.length === 1 ? "" : "s"}
          </h3>
          <p className={styles.sectionMeta}>
            Edit generated questions or add your own before saving.
          </p>
        </div>
        <Button
          type="button"
          className={btnSecondary}
          disabled={disabled}
          onClick={addQuestion}
        >
          Add question
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className={styles.emptyQuestions}>
          No questions yet. Generate a draft above or add a question manually.
        </p>
      ) : (
        <div className={styles.questionList}>
          {questions.map((question, index) => (
            <article key={question.id} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <h4 className={styles.questionTitle}>Question {index + 1}</h4>
                <Button
                  type="button"
                  className={btnDanger}
                  disabled={disabled}
                  onClick={() => removeQuestion(index)}
                >
                  Remove
                </Button>
              </div>

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <span className={styles.label}>Type</span>
                  <Combobox
                    options={QUESTION_TYPES.map((item) => ({
                      value: item.value,
                      label: item.label,
                      description: item.description,
                      keywords: [item.value, item.label],
                    }))}
                    value={question.type}
                    onValueChange={(value) =>
                      handleTypeChange(index, value as QuizQuestionType)
                    }
                    disabled={disabled}
                    placeholder="Choose type"
                    searchPlaceholder="Type multiple choice…"
                    emptyMessage="No types match."
                    triggerClassName={controlClass}
                    aria-label={`Question ${index + 1} type`}
                  />
                </div>

                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <label
                    className={styles.label}
                    htmlFor={`quiz-q-${question.id}-prompt`}
                  >
                    Prompt
                  </label>
                  <textarea
                    id={`quiz-q-${question.id}-prompt`}
                    className={styles.control}
                    value={question.prompt}
                    disabled={disabled}
                    onChange={(event) =>
                      updateQuestion(index, { prompt: event.target.value })
                    }
                  />
                </div>

                {question.type === "multiple_choice" ||
                question.type === "true_false" ? (
                  <div className={`${styles.field} ${styles.fieldWide}`}>
                    <span className={styles.label}>Options</span>
                    <div className={styles.optionsList}>
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div key={optionIndex} className={styles.optionRow}>
                          <input
                            type="text"
                            className={styles.control}
                            value={option}
                            disabled={disabled || question.type === "true_false"}
                            onChange={(event) =>
                              updateOption(index, optionIndex, event.target.value)
                            }
                          />
                          {question.type === "multiple_choice" ? (
                            <Button
                              type="button"
                              className={btnDanger}
                              disabled={
                                disabled || (question.options?.length ?? 0) <= 2
                              }
                              onClick={() => removeOption(index, optionIndex)}
                            >
                              Remove
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {question.type === "multiple_choice" ? (
                      <div className={styles.generateActions}>
                        <Button
                          type="button"
                          className={btnSecondary}
                          disabled={disabled}
                          onClick={() => addOption(index)}
                        >
                          Add option
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.field}>
                  <label
                    className={styles.label}
                    htmlFor={`quiz-q-${question.id}-answer`}
                  >
                    Correct answer
                  </label>
                  {question.type === "true_false" ? (
                    <Combobox
                      options={TRUE_FALSE_OPTIONS}
                      value={question.correctAnswer || "True"}
                      onValueChange={(value) =>
                        updateQuestion(index, { correctAnswer: value })
                      }
                      disabled={disabled}
                      placeholder="Choose answer"
                      searchPlaceholder="True or False…"
                      emptyMessage="No answers match."
                      triggerClassName={controlClass}
                      aria-label={`Question ${index + 1} correct answer`}
                    />
                  ) : (
                    <input
                      id={`quiz-q-${question.id}-answer`}
                      type="text"
                      className={styles.control}
                      value={question.correctAnswer}
                      disabled={disabled}
                      onChange={(event) =>
                        updateQuestion(index, {
                          correctAnswer: event.target.value,
                        })
                      }
                    />
                  )}
                </div>

                <div className={styles.field}>
                  <label
                    className={styles.label}
                    htmlFor={`quiz-q-${question.id}-citation`}
                  >
                    Citation
                  </label>
                  <input
                    id={`quiz-q-${question.id}-citation`}
                    type="text"
                    className={styles.control}
                    value={question.citation ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updateQuestion(index, {
                        citation: event.target.value || null,
                      })
                    }
                  />
                </div>

                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <label
                    className={styles.label}
                    htmlFor={`quiz-q-${question.id}-explanation`}
                  >
                    Explanation
                  </label>
                  <textarea
                    id={`quiz-q-${question.id}-explanation`}
                    className={styles.control}
                    value={question.explanation ?? ""}
                    disabled={disabled}
                    onChange={(event) =>
                      updateQuestion(index, {
                        explanation: event.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
