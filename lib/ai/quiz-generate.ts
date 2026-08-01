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

/**
 * Quiz generation knobs.
 *
 * Admin panel (per generation — defaults hard-coded for now):
 *   difficulty, questionTypes, focus, temperature ("Variation"),
 *   questionCount, title, seed, translation + passage range
 *
 * Platform defaults (future site settings, not per-quiz):
 *   min/max questions, heuristic count bands, default translation
 */
const PLATFORM = {
  minQuestions: 3,
  maxQuestions: 20,
  defaultTemperature: 0.2,
  defaultDifficulty: "medium" as QuizDifficulty,
  defaultFocus: "mixed" as QuizFocus,
  defaultQuestionTypes: [
    "multiple_choice",
    "short_answer",
  ] as QuizQuestionType[],
  defaultTranslation: "WEB",
  /** verseCount ≤ maxVerses → suggested question count */
  countBands: [
    { maxVerses: 4, count: 3 },
    { maxVerses: 12, count: 5 },
    { maxVerses: 25, count: 8 },
    { maxVerses: 40, count: 12 },
    { maxVerses: Infinity, count: 15 },
  ],
} as const;

const DIFFICULTIES = new Set<QuizDifficulty>(["easy", "medium", "hard"]);
const FOCUSES = new Set<QuizFocus>([
  "factual",
  "thematic",
  "application",
  "mixed",
]);
const QUESTION_TYPES = new Set<QuizQuestionType>([
  "multiple_choice",
  "true_false",
  "short_answer",
]);

export class QuizGenerateError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "QuizGenerateError";
    this.status = status;
  }
}

const pick = <T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T,
): T => {
  if (value && allowed.has(value as T)) {
    return value as T;
  }
  return fallback;
};

const text = (...candidates: unknown[]) => {
  for (const value of candidates) {
    const candidate = value as string;
    if (candidate?.trim?.()) {
      return candidate.trim();
    }
  }
  return "";
};

const positiveInt = (value: unknown) => {
  const n = Number(value);
  if (Number.isInteger(n) && n > 0) {
    return n;
  }
  return null;
};

export function parseChapterVerse(
  value: unknown,
  label: string,
): QuizVerseRef {
  if (!value) {
    throw new QuizGenerateError(
      `${label} must be { chapter, verse } or "chapter:verse"`,
    );
  }

  const { chapter, verse } = value as QuizVerseRef;
  const objectChapter = positiveInt(chapter);
  const objectVerse = positiveInt(verse);
  if (objectChapter && objectVerse) {
    return { chapter: objectChapter, verse: objectVerse };
  }

  const [start, end] = `${value}`.trim().split(":");
  const c = positiveInt(start);
  const v = positiveInt(end);
  if (c && v) {
    return { chapter: c, verse: v };
  }

  throw new QuizGenerateError(
    `${label} must be { chapter, verse } or "chapter:verse"`,
  );
}

const isRefBeforeOrEqual = (left: QuizVerseRef, right: QuizVerseRef) =>
  left.chapter < right.chapter ||
  (left.chapter === right.chapter && left.verse <= right.verse);

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Deterministic 32-bit seed from passage + generation knobs. */
export function deriveQuizSeed({
  translation,
  book,
  start,
  end,
  difficulty,
  questionTypes,
  focus,
  questionCount,
}: {
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
    translation.trim().toUpperCase(),
    book.trim().toLowerCase(),
    `${start.chapter}:${start.verse}`,
    `${end.chapter}:${end.verse}`,
    difficulty,
    [...questionTypes].sort().join(","),
    focus,
    questionCount ?? "auto",
  ].join("|");

  return createHash("sha256").update(payload).digest().readUInt32BE(0);
}

export function normalizeGenerateRequest(
  body: Record<string, unknown>,
): QuizGenerateRequest {
  const {
    translation,
    book,
    start: startRaw,
    end: endRaw,
    difficulty,
    questionTypes,
    question_types,
    focus,
    temperature,
    variation,
    questionCount,
    question_count,
    seed: seedRaw,
    title,
  } = body;

  const bookName = text(book);
  if (!bookName) {
    throw new QuizGenerateError("book is required");
  }

  const start = parseChapterVerse(startRaw, "start");
  const end = parseChapterVerse(endRaw ?? startRaw, "end");
  if (!isRefBeforeOrEqual(start, end)) {
    throw new QuizGenerateError("end must be at or after start");
  }

  const incomingTypes = questionTypes ?? question_types;
  const rawTypes = Array.isArray(incomingTypes)
    ? (incomingTypes as QuizQuestionType[])
    : [...PLATFORM.defaultQuestionTypes];

  const uniqueTypes = [
    ...new Set(rawTypes.filter((t) => QUESTION_TYPES.has(t))),
  ];

  let count: number | undefined;
  const rawCount = questionCount ?? question_count;
  if (rawCount != null && rawCount !== "") {
    const n = Number(rawCount);
    if (!Number.isInteger(n)) {
      throw new QuizGenerateError("questionCount must be an integer");
    }
    if (n < PLATFORM.minQuestions || n > PLATFORM.maxQuestions) {
      throw new QuizGenerateError(
        `questionCount must be between ${PLATFORM.minQuestions} and ${PLATFORM.maxQuestions}`,
      );
    }
    count = n;
  }

  let seed: number | undefined;
  if (seedRaw != null && seedRaw !== "") {
    const n = Number(seedRaw);
    if (!Number.isInteger(n) || n < 0) {
      throw new QuizGenerateError("seed must be a non-negative integer");
    }
    seed = n;
  }

  const temp = Number(temperature ?? variation);
  return {
    translation: text(translation) || PLATFORM.defaultTranslation,
    book: bookName,
    start,
    end,
    questionCount: count,
    difficulty: pick(difficulty, DIFFICULTIES, PLATFORM.defaultDifficulty),
    questionTypes: uniqueTypes.length
      ? uniqueTypes
      : [...PLATFORM.defaultQuestionTypes],
    focus: pick(focus, FOCUSES, PLATFORM.defaultFocus),
    temperature: Number.isFinite(temp)
      ? clamp(temp, 0, 1)
      : PLATFORM.defaultTemperature,
    seed,
    title: text(title) || undefined,
  };
}

const formatPassageForPrompt = (passage: BiblePassageResponse) =>
  passage.verses
    .map(({ chapter, verse, text: verseText }) =>
      `${chapter}:${verse} ${verseText.trim()}`,
    )
    .join("\n");

const formatRangeLabel = (
  book: string,
  start: QuizVerseRef,
  end: QuizVerseRef,
) => {
  if (start.chapter === end.chapter && start.verse === end.verse) {
    return `${book} ${start.chapter}:${start.verse}`;
  }
  if (start.chapter === end.chapter) {
    return `${book} ${start.chapter}:${start.verse}-${end.verse}`;
  }
  return `${book} ${start.chapter}:${start.verse}-${end.chapter}:${end.verse}`;
};

const suggestCountFromVerseCount = (verseCount: number) => {
  const band = PLATFORM.countBands.find(({ maxVerses }) => verseCount <= maxVerses);
  return Math.min(PLATFORM.maxQuestions, band?.count ?? PLATFORM.minQuestions);
};

const normalizeGeneratedQuestions = (
  raw: unknown,
  allowedTypes: QuizQuestionType[],
): QuizQuestion[] => {
  if (!Array.isArray(raw) || !raw.length) {
    throw new QuizGenerateError("Model returned no questions", 502);
  }

  return raw.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const type = pick(
      row.type ?? row.questionType,
      QUESTION_TYPES,
      "short_answer",
    );
    const prompt = text(row.prompt, row.question);
    const correctAnswer = text(
      row.correctAnswer,
      row.correct_answer,
      row.answer,
    );

    if (!prompt) {
      throw new QuizGenerateError(
        `Question ${index + 1} is missing a prompt`,
        502,
      );
    }
    if (!correctAnswer) {
      throw new QuizGenerateError(
        `Question ${index + 1} is missing a correctAnswer`,
        502,
      );
    }

    let options = Array.isArray(row.options)
      ? (row.options
          .map((o) => (o as string)?.trim?.())
          .filter(Boolean) as string[])
      : null;
    if (options && !options.length) {
      options = null;
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

    return {
      id: text(row.id) || `q${index + 1}`,
      type: allowedTypes.includes(type) ? type : allowedTypes[0],
      prompt,
      options,
      correctAnswer,
      citation: text(row.citation) || null,
      explanation: text(row.explanation) || null,
    };
  });
};

type ModelQuizPayload = {
  title?: string;
  suggestedQuestionCount?: number;
  questions?: unknown;
};

const buildSystemPrompt = () =>
  [
    "You generate Bible study quizzes strictly from the provided passage text.",
    "Do not invent details that are not supported by the passage.",
    "Every question must include a citation in book chapter:verse form when possible.",
    "Return JSON only matching the schema.",
    "For multiple_choice provide 3-4 options with exactly one correct answer.",
    "For true_false, correctAnswer must be True or False.",
    "For short_answer, correctAnswer should be a concise expected answer.",
    `Keep question count between ${PLATFORM.minQuestions} and ${PLATFORM.maxQuestions}.`,
  ].join(" ");

const buildUserPrompt = (
  request: QuizGenerateRequest,
  passage: BiblePassageResponse,
  seed: number,
  targetCount: number,
) => {
  const rangeLabel = formatRangeLabel(request.book, request.start, request.end);

  return [
    `Passage: ${rangeLabel} (${request.translation})`,
    `Verse count: ${passage.verses.length}`,
    `Difficulty: ${request.difficulty}`,
    `Focus: ${request.focus}`,
    `Allowed question types: ${request.questionTypes.join(", ")}`,
    `Target question count: ${targetCount}`,
    `Seed: ${seed}`,
    request.title && `Preferred title: ${request.title}`,
    "",
    "Passage text:",
    formatPassageForPrompt(passage),
    "",
    "Respond with JSON:",
    '{ "title": string, "suggestedQuestionCount": number, "questions": [',
    '  { "id": string, "type": "multiple_choice"|"true_false"|"short_answer",',
    '    "prompt": string, "options": string[]|null, "correctAnswer": string,',
    '    "citation": string|null, "explanation": string|null }',
    "] }",
  ]
    .filter(Boolean)
    .join("\n");
};

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
  ).slice(0, PLATFORM.maxQuestions);

  if (questions.length < PLATFORM.minQuestions) {
    throw new QuizGenerateError(
      `Expected at least ${PLATFORM.minQuestions} questions`,
      502,
    );
  }

  const suggestedFromModel = Number(parsed.suggestedQuestionCount);
  const suggestedQuestionCount =
    Number.isInteger(suggestedFromModel) &&
    suggestedFromModel >= PLATFORM.minQuestions &&
    suggestedFromModel <= PLATFORM.maxQuestions
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
    text(parsed.title) ||
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
