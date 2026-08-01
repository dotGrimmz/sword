import type {
  Quiz,
  QuizDifficulty,
  QuizFocus,
  QuizGenerationConfig,
  QuizInput,
  QuizQuestion,
  QuizQuestionType,
  QuizStatus,
} from "@/types/quizzes";

const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];
const FOCUSES: QuizFocus[] = [
  "factual",
  "thematic",
  "application",
  "mixed",
];
const QUESTION_TYPES: QuizQuestionType[] = [
  "multiple_choice",
  "true_false",
  "short_answer",
];
const STATUSES: QuizStatus[] = ["draft", "published", "archived"];

const trimRequired = (value: unknown, label: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
};

const asPositiveInt = (value: unknown, label: string): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return n;
};

const asStatus = (value: unknown): QuizStatus => {
  if (typeof value === "string" && STATUSES.includes(value as QuizStatus)) {
    return value as QuizStatus;
  }
  return "draft";
};

const asDifficulty = (value: unknown): QuizDifficulty => {
  if (typeof value === "string" && DIFFICULTIES.includes(value as QuizDifficulty)) {
    return value as QuizDifficulty;
  }
  return "medium";
};

const asFocus = (value: unknown): QuizFocus => {
  if (typeof value === "string" && FOCUSES.includes(value as QuizFocus)) {
    return value as QuizFocus;
  }
  return "mixed";
};

const asQuestionTypes = (value: unknown): QuizQuestionType[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return ["multiple_choice", "short_answer"];
  }
  const types = value.filter(
    (item): item is QuizQuestionType =>
      typeof item === "string" &&
      QUESTION_TYPES.includes(item as QuizQuestionType),
  );
  return types.length > 0 ? [...new Set(types)] : ["multiple_choice"];
};

const asTemperature = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0.2;
  return Math.min(1, Math.max(0, n));
};

const asSeed = (value: unknown): number => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < 0) return 0;
  return n;
};

export function normalizeGenerationConfig(
  value: unknown,
): QuizGenerationConfig {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    difficulty: asDifficulty(row.difficulty),
    questionTypes: asQuestionTypes(
      row.questionTypes ?? row.question_types,
    ),
    focus: asFocus(row.focus),
    temperature: asTemperature(row.temperature ?? row.variation),
    seed: asSeed(row.seed),
  };
}

export function normalizeQuizQuestion(
  value: unknown,
  index: number,
): QuizQuestion {
  const row =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const typeRaw = row.type;
  const type =
    typeof typeRaw === "string" &&
    QUESTION_TYPES.includes(typeRaw as QuizQuestionType)
      ? (typeRaw as QuizQuestionType)
      : "short_answer";

  const prompt = trimRequired(
    row.prompt ?? row.question,
    `questions[${index}].prompt`,
  );
  const correctAnswer = trimRequired(
    row.correctAnswer ?? row.correct_answer ?? row.answer,
    `questions[${index}].correctAnswer`,
  );

  let options: string[] | null = null;
  if (Array.isArray(row.options)) {
    options = row.options
      .filter((opt): opt is string => typeof opt === "string")
      .map((opt) => opt.trim())
      .filter(Boolean);
    if (options.length === 0) options = null;
  }

  if (type === "true_false") {
    options = ["True", "False"];
  }

  return {
    id:
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : `q${index + 1}`,
    type,
    prompt,
    options,
    correctAnswer,
    citation:
      typeof row.citation === "string" && row.citation.trim()
        ? row.citation.trim()
        : null,
    explanation:
      typeof row.explanation === "string" && row.explanation.trim()
        ? row.explanation.trim()
        : null,
  };
}

export function normalizeQuizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value)) {
    throw new Error("questions must be an array");
  }
  if (value.length === 0) {
    throw new Error("questions must not be empty");
  }
  return value.map((item, index) => normalizeQuizQuestion(item, index));
}

export function normalizeQuizRow(row: Record<string, unknown>): Quiz {
  const questions = Array.isArray(row.questions)
    ? row.questions.map((item, index) => {
        try {
          return normalizeQuizQuestion(item, index);
        } catch {
          return {
            id: `q${index + 1}`,
            type: "short_answer" as const,
            prompt: "",
            options: null,
            correctAnswer: "",
            citation: null,
            explanation: null,
          };
        }
      })
    : [];

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    status: asStatus(row.status),
    translation_code: String(row.translation_code ?? "WEB"),
    book: String(row.book ?? ""),
    start_chapter: Number(row.start_chapter ?? 1) || 1,
    start_verse: Number(row.start_verse ?? 1) || 1,
    end_chapter: Number(row.end_chapter ?? 1) || 1,
    end_verse: Number(row.end_verse ?? 1) || 1,
    generation_config: normalizeGenerationConfig(row.generation_config),
    questions,
    question_count: Number(row.question_count ?? questions.length) || 0,
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function normalizeQuizInput(body: Record<string, unknown>): QuizInput {
  const title = trimRequired(body.title, "title");
  const book = trimRequired(body.book, "book");
  const translation_code =
    typeof body.translation_code === "string" && body.translation_code.trim()
      ? body.translation_code.trim()
      : typeof body.translation === "string" && body.translation.trim()
        ? body.translation.trim()
        : "WEB";

  const start_chapter = asPositiveInt(
    body.start_chapter ??
      (body.start && typeof body.start === "object"
        ? (body.start as Record<string, unknown>).chapter
        : undefined),
    "start_chapter",
  );
  const start_verse = asPositiveInt(
    body.start_verse ??
      (body.start && typeof body.start === "object"
        ? (body.start as Record<string, unknown>).verse
        : undefined),
    "start_verse",
  );
  const end_chapter = asPositiveInt(
    body.end_chapter ??
      (body.end && typeof body.end === "object"
        ? (body.end as Record<string, unknown>).chapter
        : undefined) ??
      start_chapter,
    "end_chapter",
  );
  const end_verse = asPositiveInt(
    body.end_verse ??
      (body.end && typeof body.end === "object"
        ? (body.end as Record<string, unknown>).verse
        : undefined) ??
      start_verse,
    "end_verse",
  );

  if (
    end_chapter < start_chapter ||
    (end_chapter === start_chapter && end_verse < start_verse)
  ) {
    throw new Error("end reference must be at or after start");
  }

  const questions = normalizeQuizQuestions(body.questions);
  const generation_config = normalizeGenerationConfig(
    body.generation_config ?? body.generationConfig,
  );

  return {
    title,
    status: asStatus(body.status),
    translation_code,
    book,
    start_chapter,
    start_verse,
    end_chapter,
    end_verse,
    generation_config,
    questions,
  };
}

export function quizInputToRow(input: QuizInput, createdBy?: string) {
  return {
    title: input.title,
    status: input.status,
    translation_code: input.translation_code,
    book: input.book,
    start_chapter: input.start_chapter,
    start_verse: input.start_verse,
    end_chapter: input.end_chapter,
    end_verse: input.end_verse,
    generation_config: input.generation_config,
    questions: input.questions,
    question_count: input.questions.length,
    ...(createdBy ? { created_by: createdBy } : {}),
    updated_at: new Date().toISOString(),
  };
}
