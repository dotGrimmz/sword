import type {
  Quiz,
  QuizAttemptAnswer,
  QuizAttemptQuestionResult,
  QuizQuestion,
  QuizQuestionType,
} from "@/types/quizzes";

const normalizeAnswer = (value: string, type: QuizQuestionType): string => {
  const trimmed = value.trim();
  if (type === "short_answer") {
    return trimmed.toLowerCase();
  }
  if (type === "true_false") {
    const lower = trimmed.toLowerCase();
    if (lower === "true" || lower === "t") return "true";
    if (lower === "false" || lower === "f") return "false";
    return lower;
  }
  return trimmed;
};

export function isAnswerCorrect(
  question: QuizQuestion,
  given: string,
): boolean {
  const expected = normalizeAnswer(question.correctAnswer, question.type);
  const actual = normalizeAnswer(given, question.type);
  return expected.length > 0 && expected === actual;
}

export function scoreQuizAttempt(
  quiz: Quiz,
  answers: QuizAttemptAnswer[],
): {
  score: number;
  maxScore: number;
  results: QuizAttemptQuestionResult[];
  answersPayload: Array<{
    questionId: string;
    value: string;
    correct: boolean;
  }>;
} {
  const byId = new Map(
    answers.map((a) => [a.questionId, typeof a.value === "string" ? a.value : ""]),
  );

  const results: QuizAttemptQuestionResult[] = quiz.questions.map(
    (question) => {
      const givenAnswer = byId.get(question.id) ?? "";
      const correct = isAnswerCorrect(question, givenAnswer);
      return {
        questionId: question.id,
        prompt: question.prompt,
        type: question.type,
        givenAnswer,
        correct,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        citation: question.citation,
      };
    },
  );

  const score = results.filter((r) => r.correct).length;
  const maxScore = results.length;

  return {
    score,
    maxScore,
    results,
    answersPayload: results.map((r) => ({
      questionId: r.questionId,
      value: r.givenAnswer,
      correct: r.correct,
    })),
  };
}
