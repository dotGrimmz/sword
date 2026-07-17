import { NextResponse } from "next/server";

import { startOfWeek, weekVisibilityWindow } from "@/lib/study/week";
import {
  PRE_READ_SELECT,
  normalizeWeeklyStudy,
} from "@/lib/study/normalize";
import type { PreReadPayload } from "@/types/pre-read";

export { PRE_READ_SELECT, normalizeWeeklyStudy };

export const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : code === "42501" ? 403 : 500;

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

const toWeekStart = (value: unknown): string => {
  const raw = toTrimmedString(value);
  if (!raw) {
    throw new Error("week_start is required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new Error("week_start must be YYYY-MM-DD");
  }
  // Normalize to Monday of that week
  return startOfWeek(new Date(`${raw}T12:00:00`));
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

  const title =
    toTrimmedString(payload.title) ||
    `${book} ${toPositiveInteger(payload.chapter, "Chapter")}`;

  const chapter = toPositiveInteger(payload.chapter, "Chapter");
  const week_start = toWeekStart(payload.week_start ?? payload.weekStart);
  const window = weekVisibilityWindow(week_start);

  // Prefer derived week window; allow explicit overrides if both provided
  const visible_from =
    toDateTimeString(payload.visible_from, "visible_from", {
      required: false,
    }) ?? window.from;
  const visible_until =
    toDateTimeString(payload.visible_until, "visible_until", {
      required: false,
    }) ?? window.until;

  if (new Date(visible_from).getTime() >= new Date(visible_until).getTime()) {
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
    title,
    week_start,
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
    visible_from,
    visible_until,
    published: toBoolean(payload.published, false),
  };
};

export async function requireAdmin(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null as null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      user: null as null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, error: null as null };
}
