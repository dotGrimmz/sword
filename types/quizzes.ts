export type QuizStatus = "draft" | "published" | "archived";

export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizQuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer";

export type QuizFocus =
  | "factual"
  | "thematic"
  | "application"
  | "mixed";

export type QuizVerseRef = {
  chapter: number;
  verse: number;
};

export type QuizGenerationConfig = {
  difficulty: QuizDifficulty;
  questionTypes: QuizQuestionType[];
  focus: QuizFocus;
  /** OpenAI temperature. UI may label this "Variation". */
  temperature: number;
  seed: number;
};

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options: string[] | null;
  correctAnswer: string;
  citation: string | null;
  explanation: string | null;
};

/** Default / clamp bounds for per-quiz attempt limits. */
export const DEFAULT_MAX_ATTEMPTS = 3;
export const MIN_MAX_ATTEMPTS = 1;
export const MAX_MAX_ATTEMPTS = 20;

export const ATTEMPT_LIMIT_REACHED_MESSAGE = "Attempt limit reached";

export type Quiz = {
  id: string;
  title: string;
  status: QuizStatus;
  translation_code: string;
  book: string;
  start_chapter: number;
  start_verse: number;
  end_chapter: number;
  end_verse: number;
  generation_config: QuizGenerationConfig;
  questions: QuizQuestion[];
  question_count: number;
  max_attempts: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuizInput = {
  title: string;
  status: QuizStatus;
  translation_code: string;
  book: string;
  start_chapter: number;
  start_verse: number;
  end_chapter: number;
  end_verse: number;
  generation_config: QuizGenerationConfig;
  questions: QuizQuestion[];
  max_attempts: number;
};

export type QuizGenerateRequest = {
  translation: string;
  book: string;
  start: QuizVerseRef;
  end: QuizVerseRef;
  /** When omitted, the model suggests a count. */
  questionCount?: number;
  difficulty: QuizDifficulty;
  questionTypes: QuizQuestionType[];
  focus: QuizFocus;
  temperature: number;
  seed?: number;
  title?: string;
};

export type QuizGenerateResult = {
  title: string;
  suggestedQuestionCount: number;
  questions: QuizQuestion[];
  generationConfig: QuizGenerationConfig;
  translation: string;
  book: string;
  range: {
    start: QuizVerseRef;
    end: QuizVerseRef;
  };
  model: string;
  verseCount: number;
};

/** Official score progress for a member on one quiz (from quiz_scores). */
export type QuizAttemptProgress = {
  attemptCount: number;
  maxAttempts: number;
  attemptsRemaining: number;
  bestScore: number | null;
  bestMaxScore: number | null;
  bestPercent: number | null;
  finalized: boolean;
  bestAttemptId: string | null;
};

/** Published quiz list card — no question content. */
export type PublicQuizSummary = {
  id: string;
  title: string;
  translation_code: string;
  book: string;
  start_chapter: number;
  start_verse: number;
  end_chapter: number;
  end_verse: number;
  question_count: number;
  max_attempts: number;
  updated_at: string;
  /** Present when loaded for the signed-in member. */
  progress?: QuizAttemptProgress | null;
};

/** Question shape safe to send before submit (no answers). */
export type PublicQuizQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  options: string[] | null;
  citation: string | null;
};

export type PublicQuizDetail = PublicQuizSummary & {
  questions: PublicQuizQuestion[];
};

export type QuizAttemptAnswer = {
  questionId: string;
  value: string;
};

export type QuizAttemptQuestionResult = {
  questionId: string;
  prompt: string;
  type: QuizQuestionType;
  givenAnswer: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string | null;
  citation: string | null;
};

export type QuizAttemptResult = {
  attemptId: string;
  quizId: string;
  score: number;
  maxScore: number;
  results: QuizAttemptQuestionResult[];
  attemptNumber: number;
  maxAttempts: number;
  attemptsRemaining: number;
  bestScore: number;
  bestMaxScore: number;
  bestPercent: number;
  finalized: boolean;
};

/** Admin: one member's official score on a quiz. */
export type AdminQuizScoreRow = {
  userId: string;
  username: string | null;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  title: string | null;
  role: string;
  bestScore: number;
  maxScore: number;
  bestPercent: number;
  attemptCount: number;
  maxAttempts: number;
  finalized: boolean;
  bestAttemptId: string | null;
  firstCompletedAt: string;
  bestAchievedAt: string;
};

export type AdminQuizAttemptAnswer = {
  questionId: string;
  prompt: string;
  value: string;
  correct: boolean;
  correctAnswer: string | null;
};

/** Admin: one completed attempt with answer breakdown. */
export type AdminQuizAttemptRow = {
  attemptId: string;
  score: number;
  maxScore: number;
  completedAt: string | null;
  isBest: boolean;
  answers: AdminQuizAttemptAnswer[];
};

export type AdminQuizScoresSummary = {
  memberCount: number;
  finalizedCount: number;
  averageBestPercent: number | null;
};
