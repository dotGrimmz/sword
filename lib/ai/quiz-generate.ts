import { createHash } from "crypto";

import type { BiblePassageResponse } from "@/types/bible";
import type {
  QuizDifficulty,
  QuizFocus,
  QuizGenerateRequest,
  QuizGenerateResult,
  QuizGenerationConfig,
  QuizQuestion,
  QuizQuestionType,
  QuizVerseRef,
} from "@/types/quizzes";

import { getOpenAIClient, QUIZ_MODEL } from "@/lib/ai/openai";

const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 20;
const DEFAULT_TEMPERATURE = 0.2;

const QUESTION_TYPES: QuizQuestionType[] = [
  "multiple_choice",
  "true_false",
  "short_answer",
];

const DIFFICULTIES: QuizDifficulty[] = ["easy", "medium", "hard"];
const FOCUSES: QuizFocus[] = [
  "factual",
  "thematic",
  "application",
  "mixed",
];

export class QuizGenerateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "QuizGenerateError";
    this.status = status;
  }
}

export function parseChapterVerse(
  value: unknown,
  label: string,
): QuizVerseRef {
  if (
    value &&
    typeof value === "object" &&
    "chapter" in value &&
    "verse" in value
  ) {
    const chapter = Number((value as QuizVerseRef).chapter);
    const verse = Number((value as QuizVerseRef).verse);
    if (
      Number.isInteger(chapter) &&
      chapter > 0 &&
      Number.isInteger(verse) &&
      verse > 0
    ) {
      return { chapter, verse };
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const parts = trimmed.split(":");
    if (parts.length === 2) {
      const chapter = Number(parts[0]);
      const verse = Number(parts[1]);
      if (
        Number.isInteger(chapter) &&
        chapter > 0 &&
        Number.isInteger(verse) &&
        verse > 0
      ) {
        return { chapter, verse };
      }
    }
  }

  throw new QuizGenerateError(
    `${label} must be { chapter, verse } or "chapter:verse"`,
  );
}

function isRefBeforeOrEqual(left: QuizVerseRef, right: QuizVerseRef) {
  return (
    left.chapter < right.chapter ||
    (left.chapter === right.chapter && left.verse <= right.verse)
  );
}

function asDifficulty(value: unknown): QuizDifficulty {
  if (typeof value === "string" && DIFFICULTIES.includes(value as QuizDifficulty)) {
    return value as QuizDifficulty;
  }
  return "medium";
}

function asFocus(value: unknown): QuizFocus {
  if (typeof value === "string" && FOCUSES.includes(value as QuizFocus)) {
    return value as QuizFocus;
  }
  return "mixed";
}

function asQuestionTypes(value: unknown): QuizQuestionType[] {
  if (!Array.isArray(value) || value.length === 0) {
    return ["multiple_choice", "short_answer"];
  }

  const types = value.filter(
    (item): item is QuizQuestionType =>
      typeof item === "string" &&
      QUESTION_TYPES.includes(item as QuizQuestionType),
  );

  return types.length > 0 ? [...new Set(types)] : ["multiple_choice"];
}

function clampTemperature(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_TEMPERATURE;
  return Math.min(1, Math.max(0, n));
}

function clampQuestionCount(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) {
    throw new QuizGenerateError("questionCount must be an integer");
  }
  if (n < MIN_QUESTIONS || n > MAX_QUESTIONS) {
    throw new QuizGenerateError(
      `questionCount must be between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}`,
    );
  }
  return n;
}

/** Deterministic 32-bit seed from passage + generation knobs. */
export function deriveQuizSeed(parts: {
  translation: string;
  book: string;
  start: QuizVerseRef;
  end: QuizVerseRef;
  difficulty: QuizDifficulty;
  questionTypes: QuizQuestionType[];
  focus: QuizFocus;
  questionCount?: number;
}): number {
  const payload = [
    parts.translation.trim().toUpperCase(),
    parts.book.trim().toLowerCase(),
    `${parts.start.chapter}:${parts.start.verse}`,
    `${parts.end.chapter}:${parts.end.verse}`,
    parts.difficulty,
    [...parts.questionTypes].sort().join(","),
    parts.focus,
    parts.questionCount ?? "auto",
  ].join("|");

  const digest = createHash("sha256").update(payload).digest();
  return digest.readUInt32BE(0);
}

export function normalizeGenerateRequest(
  body: Record<string, unknown>,
): QuizGenerateRequest {
  const translation =
    typeof body.translation === "string" && body.translation.trim()
      ? body.translation.trim()
      : "WEB";

  const book =
    typeof body.book === "string" ? body.book.trim() : "";
  if (!book) {
    throw new QuizGenerateError("book is required");
  }

  const start = parseChapterVerse(body.start, "start");
  const end = parseChapterVerse(body.end ?? body.start, "end");

  if (!isRefBeforeOrEqual(start, end)) {
    throw new QuizGenerateError("end must be at or after start");
  }

  const difficulty = asDifficulty(body.difficulty);
  const questionTypes = asQuestionTypes(body.questionTypes ?? body.question_types);
  const focus = asFocus(body.focus);
  const temperature = clampTemperature(
    body.temperature ?? body.variation ?? DEFAULT_TEMPERATURE,
  );
  const questionCount = clampQuestionCount(
    body.questionCount ?? body.question_count,
  );

  let seed: number | undefined;
  if (body.seed != null && body.seed !== "") {
    const n = typeof body.seed === "number" ? body.seed : Number(body.seed);
    if (!Number.isInteger(n) || n < 0) {
      throw new QuizGenerateError("seed must be a non-negative integer");
    }
    seed = n;
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : undefined;

  return {
    translation,
    book,
    start,
    end,
    questionCount,
    difficulty,
    questionTypes,
    focus,
    temperature,
    seed,
    title,
  };
}

function formatPassageForPrompt(passage: BiblePassageResponse): string {
  return passage.verses
    .map((v) => `${v.chapter}:${v.verse} ${v.text.trim()}`)
    .join("\n");
}

function formatRangeLabel(
  book: string,
  start: QuizVerseRef,
  end: QuizVerseRef,
): string {
  if (start.chapter === end.chapter && start.verse === end.verse) {
    return `${book} ${start.chapter}:${start.verse}`;
  }
  if (start.chapter === end.chapter) {
    return `${book} ${start.chapter}:${start.verse}-${end.verse}`;
  }
  return `${book} ${start.chapter}:${start.verse}-${end.chapter}:${end.verse}`;
}

function suggestCountFromVerseCount(verseCount: number): number {
  if (verseCount <= 4) return MIN_QUESTIONS;
  if (verseCount <= 12) return 5;
  if (verseCount <= 25) return 8;
  if (verseCount <= 40) return 12;
  return Math.min(MAX_QUESTIONS, 15);
}

function asQuestionType(value: unknown): QuizQuestionType {
  if (
    typeof value === "string" &&
    QUESTION_TYPES.includes(value as QuizQuestionType)
  ) {
    return value as QuizQuestionType;
  }
  return "short_answer";
}

function normalizeGeneratedQuestions(
  raw: unknown,
  allowedTypes: QuizQuestionType[],
): QuizQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new QuizGenerateError("Model returned no questions", 502);
  }

  return raw.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const type = asQuestionType(row.type ?? row.questionType);
    if (!allowedTypes.includes(type)) {
      // Keep the question but coerce to an allowed type when possible.
    }

    const prompt =
      typeof row.prompt === "string"
        ? row.prompt.trim()
        : typeof row.question === "string"
          ? row.question.trim()
          : "";
    if (!prompt) {
      throw new QuizGenerateError(
        `Question ${index + 1} is missing a prompt`,
        502,
      );
    }

    const correctAnswer =
      typeof row.correctAnswer === "string"
        ? row.correctAnswer.trim()
        : typeof row.correct_answer === "string"
          ? row.correct_answer.trim()
          : typeof row.answer === "string"
            ? row.answer.trim()
            : "";
    if (!correctAnswer) {
      throw new QuizGenerateError(
        `Question ${index + 1} is missing a correctAnswer`,
        502,
      );
    }

    let options: string[] | null = null;
    if (Array.isArray(row.options)) {
      options = row.options
        .filter((opt): opt is string => typeof opt === "string")
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (options.length === 0) options = null;
    }

    if (type === "multiple_choice" && (!options || options.length < 2)) {
      throw new QuizGenerateError(
        `Question ${index + 1} multiple_choice needs at least 2 options`,
        502,
      );
    }

    if (type === "true_false") {
      options = ["True", "False"];
    }

    const citation =
      typeof row.citation === "string" && row.citation.trim()
        ? row.citation.trim()
        : null;
    const explanation =
      typeof row.explanation === "string" && row.explanation.trim()
        ? row.explanation.trim()
        : null;

    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : `q${index + 1}`;

    return {
      id,
      type: allowedTypes.includes(type) ? type : allowedTypes[0],
      prompt,
      options,
      correctAnswer,
      citation,
      explanation,
    };
  });
}

type ModelQuizPayload = {
  title?: string;
  suggestedQuestionCount?: number;
  questions?: unknown;
};

function buildSystemPrompt(): string {
  return [
    "You generate Bible study quizzes strictly from the provided passage text.",
    "Do not invent details that are not supported by the passage.",
    "Every question must include a citation in book chapter:verse form when possible.",
    "Return JSON only matching the schema.",
    "For multiple_choice provide 3-4 options with exactly one correct answer.",
    "For true_false, correctAnswer must be True or False.",
    "For short_answer, correctAnswer should be a concise expected answer.",
    `Keep question count between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`,
  ].join(" ");
}

function buildUserPrompt(
  request: QuizGenerateRequest,
  passage: BiblePassageResponse,
  seed: number,
  targetCount: number,
): string {
  const rangeLabel = formatRangeLabel(request.book, request.start, request.end);
  const passageText = formatPassageForPrompt(passage);

  return [
    `Passage: ${rangeLabel} (${request.translation})`,
    `Verse count: ${passage.verses.length}`,
    `Difficulty: ${request.difficulty}`,
    `Focus: ${request.focus}`,
    `Allowed question types: ${request.questionTypes.join(", ")}`,
    `Target question count: ${targetCount}`,
    `Seed: ${seed}`,
    request.title ? `Preferred title: ${request.title}` : null,
    "",
    "Passage text:",
    passageText,
    "",
    "Respond with JSON:",
    '{ "title": string, "suggestedQuestionCount": number, "questions": [',
    '  { "id": string, "type": "multiple_choice"|"true_false"|"short_answer",',
    '    "prompt": string, "options": string[]|null, "correctAnswer": string,',
    '    "citation": string|null, "explanation": string|null }',
    "] }",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

/**
 * Generate a quiz draft from a loaded Bible passage.
 * Does not persist — caller decides whether to save via quiz loaders.
 */
export async function generateQuizFromPassage(
  request: QuizGenerateRequest,
  passage: BiblePassageResponse,
): Promise<QuizGenerateResult> {
  if (!passage.verses.length) {
    throw new QuizGenerateError("Passage has no verses", 400);
  }

  const seed =
    request.seed ??
    deriveQuizSeed({
      translation: request.translation,
      book: request.book,
      start: request.start,
      end: request.end,
      difficulty: request.difficulty,
      questionTypes: request.questionTypes,
      focus: request.focus,
      questionCount: request.questionCount,
    });

  const heuristicCount = suggestCountFromVerseCount(passage.verses.length);
  const targetCount = request.questionCount ?? heuristicCount;

  const client = getOpenAIClient();
  let completion;
  try {
    completion = await client.chat.completions.create({
      model: QUIZ_MODEL,
      temperature: request.temperature,
      seed,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt(request, passage, seed, targetCount),
        },
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI request failed";
    throw new QuizGenerateError(message, 502);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new QuizGenerateError("Empty response from OpenAI", 502);
  }

  let parsed: ModelQuizPayload;
  try {
    parsed = JSON.parse(content) as ModelQuizPayload;
  } catch {
    throw new QuizGenerateError("OpenAI returned invalid JSON", 502);
  }

  const questions = normalizeGeneratedQuestions(
    parsed.questions,
    request.questionTypes,
  ).slice(0, MAX_QUESTIONS);

  if (questions.length < MIN_QUESTIONS) {
    throw new QuizGenerateError(
      `Expected at least ${MIN_QUESTIONS} questions`,
      502,
    );
  }

  const suggestedFromModel = Number(parsed.suggestedQuestionCount);
  const suggestedQuestionCount =
    Number.isInteger(suggestedFromModel) &&
    suggestedFromModel >= MIN_QUESTIONS &&
    suggestedFromModel <= MAX_QUESTIONS
      ? suggestedFromModel
      : heuristicCount;

  const generationConfig: QuizGenerationConfig = {
    difficulty: request.difficulty,
    questionTypes: request.questionTypes,
    focus: request.focus,
    temperature: request.temperature,
    seed,
  };

  const title =
    (typeof parsed.title === "string" && parsed.title.trim()) ||
    request.title ||
    `Quiz: ${formatRangeLabel(request.book, request.start, request.end)}`;

  return {
    title,
    suggestedQuestionCount,
    questions,
    generationConfig,
    translation: request.translation,
    book: request.book,
    range: { start: request.start, end: request.end },
    model: completion.model ?? QUIZ_MODEL,
    verseCount: passage.verses.length,
  };
}
