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
