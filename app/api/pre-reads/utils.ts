import type { PreReadPayload } from "@/types/pre-read";

export const PRE_READ_SELECT = `
  *,
  host_profile:profiles!pre_reads_host_profile_id_fkey (
    id,
    username,
    avatar_url,
    stream_tagline,
    stream_url,
    is_host_active,
    role
  )
`;

export const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

const toTrimmedString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const toNullableString = (value: unknown) => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const toPositiveInteger = (value: unknown, field: string) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  throw new Error(`${field} must be a positive integer`);
};

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

const toDateTimeString = (
  value: unknown,
  field: string,
  { required }: { required: boolean },
) => {
  if (value === null || value === undefined || value === "") {
    if (required) {
      throw new Error(`${field} is required`);
    }
    return null;
  }

  const date = new Date(value as string);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${field}`);
  }

  return date.toISOString();
};

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => toTrimmedString(item))
    .filter((entry) => entry.length > 0);
};

export const normalizePreReadPayload = (
  payload: Record<string, unknown>,
): PreReadPayload => {
  const book = toTrimmedString(payload.book);
  if (!book) {
    throw new Error("Book is required");
  }

  const summary = toTrimmedString(payload.summary);
  if (!summary) {
    throw new Error("Summary is required");
  }

  const chapter = toPositiveInteger(payload.chapter, "Chapter");

  const visible_from = toDateTimeString(payload.visible_from, "visible_from", {
    required: true,
  });
  const visible_until = toDateTimeString(
    payload.visible_until,
    "visible_until",
    { required: true },
  );

  if (
    visible_from &&
    visible_until &&
    new Date(visible_from).getTime() >= new Date(visible_until).getTime()
  ) {
    throw new Error("visible_until must be after visible_from");
  }

  const reflection_questions = toStringArray(
    payload.reflection_questions ?? payload.reflectionQuestions,
  );
  const pollQuestion = toNullableString(
    payload.poll_question ?? payload.pollQuestion,
  );

  const pollOptions = toStringArray(
    payload.poll_options ?? payload.pollOptions,
  );
  const poll_options =
    pollQuestion && pollOptions.length >= 2 ? pollOptions : null;

  if (pollQuestion && (!poll_options || poll_options.length < 2)) {
    throw new Error("Poll question requires at least two poll options");
  }

  const stream_start_time = toDateTimeString(
    payload.stream_start_time ?? payload.streamStartTime,
    "stream_start_time",
    { required: false },
  );

  return {
    book,
    chapter,
    verses_range: toNullableString(
      payload.verses_range ?? payload.versesRange,
    ),
    summary,
    memory_verse: toNullableString(
      payload.memory_verse ?? payload.memoryVerse,
    ),
    reflection_questions,
    poll_question: pollQuestion,
    poll_options,
    host_profile_id: toNullableString(
      payload.host_profile_id ?? payload.hostProfileId,
    ),
    stream_start_time,
    is_cancelled: toBoolean(payload.is_cancelled ?? payload.isCancelled, false),
    visible_from: visible_from!,
    visible_until: visible_until!,
    published: toBoolean(payload.published, false),
  };
};
