"use client";

import { Button } from "@/components/ui/button";
import type { QuizQuestion, QuizQuestionType } from "@/types/quizzes";

import styles from "./QuizForm.module.css";

type QuizQuestionsEditorProps = {
  questions: QuizQuestion[];
  disabled?: boolean;
  onChange: (questions: QuizQuestion[]) => void;
};

const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / false" },
  { value: "short_answer", label: "Short answer" },
];

const btnSecondary =
  "h-11 min-h-11 px-4 text-sm border-[#e0c4b6] bg-white text-[#1a1a1a] hover:border-[#d91f26] hover:bg-[#d91f26]/10 hover:text-[#d91f26] cursor-pointer";
const btnDanger =
  "h-10 min-h-10 px-3 text-sm border-[#e0c4b6] bg-white text-[#d91f26] hover:border-[#d91f26] hover:bg-[#d91f26]/10 cursor-pointer";

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
                  <label
                    className={styles.label}
                    htmlFor={`quiz-q-${question.id}-type`}
                  >
                    Type
                  </label>
                  <select
                    id={`quiz-q-${question.id}-type`}
                    className={styles.control}
                    value={question.type}
                    disabled={disabled}
                    onChange={(event) => {
                      const type = event.target.value as QuizQuestionType;
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
                    }}
                  >
                    {QUESTION_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
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
                    <select
                      id={`quiz-q-${question.id}-answer`}
                      className={styles.control}
                      value={question.correctAnswer || "True"}
                      disabled={disabled}
                      onChange={(event) =>
                        updateQuestion(index, {
                          correctAnswer: event.target.value,
                        })
                      }
                    >
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
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
