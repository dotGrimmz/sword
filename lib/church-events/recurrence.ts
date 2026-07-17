import type {
  EventRecurrenceEndType,
  EventRecurrenceFrequency,
  EventSeries,
} from "@/types/events";

const MAX_MATERIALIZED = 26;

export type RecurrenceSeed = {
  starts_at: string;
  ends_at: string | null;
  recurrence_frequency: EventRecurrenceFrequency;
  recurrence_interval: number;
  recurrence_weekdays: number[] | null;
  recurrence_end_type: EventRecurrenceEndType;
  recurrence_until: string | null;
  recurrence_count: number | null;
};

export type GeneratedOccurrence = {
  starts_at: string;
  ends_at: string | null;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date.getTime());
  const day = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);
  // Clamp overflow (e.g. Jan 31 + 1 month).
  if (next.getUTCDate() < day) {
    next.setUTCDate(0);
  }
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const durationMs = (startsAt: Date, endsAt: Date | null) => {
  if (!endsAt) return null;
  const ms = endsAt.getTime() - startsAt.getTime();
  return ms > 0 ? ms : null;
};

const withDuration = (startsAt: Date, duration: number | null) => {
  if (duration == null) return null;
  return new Date(startsAt.getTime() + duration).toISOString();
};

const endReached = (
  seed: RecurrenceSeed,
  candidate: Date,
  generatedCount: number,
) => {
  if (seed.recurrence_end_type === "count") {
    const limit = seed.recurrence_count ?? 1;
    return generatedCount >= limit;
  }
  if (seed.recurrence_end_type === "until" && seed.recurrence_until) {
    const until = new Date(`${seed.recurrence_until}T23:59:59.999Z`);
    return candidate.getTime() > until.getTime();
  }
  return false;
};

/**
 * Expand a series seed into concrete occurrence timestamps.
 * Caps at 26 future/open-ended instances (plan: open-ended window).
 */
export function generateOccurrences(seed: RecurrenceSeed): GeneratedOccurrence[] {
  const start = new Date(seed.starts_at);
  if (Number.isNaN(start.getTime())) {
    throw new Error("starts_at is invalid");
  }
  const end = seed.ends_at ? new Date(seed.ends_at) : null;
  const duration = durationMs(start, end);

  if (seed.recurrence_frequency === "none") {
    return [
      {
        starts_at: start.toISOString(),
        ends_at: withDuration(start, duration),
      },
    ];
  }

  const interval = Math.max(1, seed.recurrence_interval || 1);
  const results: GeneratedOccurrence[] = [];
  let cursor = start;
  let safety = 0;

  while (results.length < MAX_MATERIALIZED && safety < 500) {
    safety += 1;

    if (endReached(seed, cursor, results.length)) {
      break;
    }

    const weekday = cursor.getUTCDay();
    const weekdays = seed.recurrence_weekdays?.filter(
      (day) => day >= 0 && day <= 6,
    );
    const weekdayOk =
      seed.recurrence_frequency !== "weekly" ||
      !weekdays ||
      weekdays.length === 0 ||
      weekdays.includes(weekday);

    if (weekdayOk) {
      results.push({
        starts_at: cursor.toISOString(),
        ends_at: withDuration(cursor, duration),
      });
    }

    if (seed.recurrence_frequency === "weekly") {
      cursor = addDays(cursor, 7 * interval);
    } else {
      cursor = addMonths(cursor, interval);
    }
  }

  return results;
}

export function seriesToRecurrenceSeed(
  series: Pick<
    EventSeries,
    | "starts_at"
    | "ends_at"
    | "recurrence_frequency"
    | "recurrence_interval"
    | "recurrence_weekdays"
    | "recurrence_end_type"
    | "recurrence_until"
    | "recurrence_count"
  >,
): RecurrenceSeed {
  return {
    starts_at: series.starts_at,
    ends_at: series.ends_at,
    recurrence_frequency: series.recurrence_frequency,
    recurrence_interval: series.recurrence_interval,
    recurrence_weekdays: series.recurrence_weekdays,
    recurrence_end_type: series.recurrence_end_type,
    recurrence_until: series.recurrence_until,
    recurrence_count: series.recurrence_count,
  };
}

export function formatRecurrenceSummary(
  series: Pick<
    EventSeries,
    | "recurrence_frequency"
    | "recurrence_interval"
    | "recurrence_weekdays"
    | "recurrence_end_type"
    | "recurrence_until"
    | "recurrence_count"
  >,
): string {
  const { recurrence_frequency: freq, recurrence_interval: interval } = series;
  if (freq === "none") return "One-time";

  const unit = freq === "weekly" ? "week" : "month";
  const every =
    interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;

  let end = "";
  if (series.recurrence_end_type === "until" && series.recurrence_until) {
    end = ` until ${series.recurrence_until}`;
  } else if (
    series.recurrence_end_type === "count" &&
    series.recurrence_count
  ) {
    end = `, ${series.recurrence_count} times`;
  }

  return `${every}${end}`;
}
