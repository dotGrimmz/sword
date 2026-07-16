const DEFAULT_TIME_ZONE = "America/New_York";

const pad2 = (value: number) => String(value).padStart(2, "0");

const ymdInTimeZone = (date: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to resolve calendar date in time zone");
  }

  return `${year}-${month}-${day}`;
};

const parseYmd = (ymd: string): { year: number; month: number; day: number } => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) {
    throw new Error("week_start must be YYYY-MM-DD");
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
};

const toUtcNoon = (ymd: string): Date => {
  const { year, month, day } = parseYmd(ymd);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

const formatYmdFromUtc = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )}`;

/** Monday (ISO) of the week containing `input`, as YYYY-MM-DD in `timeZone`. */
export function startOfWeek(
  input: Date = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const ymd = ymdInTimeZone(input, timeZone);
  const { year, month, day } = parseYmd(ymd);
  // Noon UTC avoids DST edge cases when shifting by weekday.
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = utcNoon.getUTCDay(); // 0 Sun .. 6 Sat
  const daysFromMonday = (weekday + 6) % 7;
  utcNoon.setUTCDate(utcNoon.getUTCDate() - daysFromMonday);
  return formatYmdFromUtc(utcNoon);
}

export function weekEndFromStart(weekStart: string): string {
  const monday = toUtcNoon(weekStart);
  monday.setUTCDate(monday.getUTCDate() + 6);
  return formatYmdFromUtc(monday);
}

/** Shift a Monday `weekStart` by `deltaWeeks` (negative = earlier). */
export function shiftWeek(weekStart: string, deltaWeeks: number): string {
  const monday = toUtcNoon(weekStart);
  monday.setUTCDate(monday.getUTCDate() + deltaWeeks * 7);
  return formatYmdFromUtc(monday);
}

export type WeekDay = {
  ymd: string;
  dayOfMonth: number;
  weekdayShort: string;
  weekdayLong: string;
  isToday: boolean;
};

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Seven days (Mon–Sun) for a week starting on `weekStart`. */
export function daysOfWeek(
  weekStart: string,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): WeekDay[] {
  const todayYmd = ymdInTimeZone(now, timeZone);
  const monday = toUtcNoon(weekStart);
  return WEEKDAY_SHORT.map((weekdayShort, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    const ymd = formatYmdFromUtc(day);
    return {
      ymd,
      dayOfMonth: day.getUTCDate(),
      weekdayShort,
      weekdayLong: WEEKDAY_LONG[index],
      isToday: ymd === todayYmd,
    };
  });
}

/** Visibility window: Monday 00:00 local through next Monday 00:00 (exclusive end as ISO). */
export function weekVisibilityWindow(weekStart: string): {
  from: string;
  until: string;
} {
  const { year, month, day } = parseYmd(weekStart);
  const from = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const until = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), until: until.toISOString() };
}

export function isCurrentWeek(
  weekStart: string,
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): boolean {
  return weekStart === startOfWeek(now, timeZone);
}

export function studyVisibilitySpec(
  row: {
    published: boolean;
    is_cancelled: boolean;
    week_start: string | null;
  },
  now = new Date(),
): boolean {
  return (
    row.published &&
    !row.is_cancelled &&
    Boolean(row.week_start) &&
    isCurrentWeek(row.week_start as string, now)
  );
}

export function formatWeekLabel(weekStart: string): string {
  const end = weekEndFromStart(weekStart);
  const startDate = new Date(`${weekStart}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
}

/** Longer range label, e.g. "Jul 13 – Jul 19, 2026". */
export function formatWeekRangeDetailed(weekStart: string): string {
  const end = weekEndFromStart(weekStart);
  const startDate = new Date(`${weekStart}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const endFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startFmt.format(startDate)} – ${endFmt.format(endDate)}`;
}

/** First day of month as YYYY-MM-DD (calendar month containing `ymd`). */
export function startOfMonth(ymd: string): string {
  const { year, month } = parseYmd(ymd);
  return `${year}-${pad2(month)}-01`;
}

export function shiftMonth(monthStart: string, deltaMonths: number): string {
  const { year, month } = parseYmd(monthStart);
  const date = new Date(Date.UTC(year, month - 1 + deltaMonths, 1, 12, 0, 0));
  return formatYmdFromUtc(date);
}

/** Today's calendar date as YYYY-MM-DD in `timeZone`. */
export function todayYmd(
  now = new Date(),
  timeZone = DEFAULT_TIME_ZONE,
): string {
  return ymdInTimeZone(now, timeZone);
}

export type CalendarDay = {
  ymd: string;
  dayOfMonth: number;
  inMonth: boolean;
  weekStart: string;
};

/**
 * Monday-start month grid covering `monthStart` (YYYY-MM-01).
 * Includes leading/trailing days so every row is a full Mon–Sun week.
 */
export function buildMonthWeeks(monthStart: string): CalendarDay[][] {
  const { year, month } = parseYmd(monthStart);
  const firstOfMonth = `${year}-${pad2(month)}-01`;
  const gridStart = startOfWeek(new Date(`${firstOfMonth}T12:00:00`));
  const cursor = toUtcNoon(gridStart);
  const weeks: CalendarDay[][] = [];

  for (let week = 0; week < 6; week += 1) {
    const row: CalendarDay[] = [];
    for (let day = 0; day < 7; day += 1) {
      const ymd = formatYmdFromUtc(cursor);
      const cellWeekStart = startOfWeek(new Date(`${ymd}T12:00:00`));
      row.push({
        ymd,
        dayOfMonth: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() + 1 === month,
        weekStart: cellWeekStart,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(row);
    if (week >= 3 && row.every((cell) => !cell.inMonth)) {
      weeks.pop();
      break;
    }
  }

  return weeks;
}
