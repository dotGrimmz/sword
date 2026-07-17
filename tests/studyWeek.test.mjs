import assert from "node:assert/strict";
import test from "node:test";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const {
  startOfWeek,
  weekEndFromStart,
  isCurrentWeek,
  formatWeekLabel,
  weekVisibilityWindow,
  shiftWeek,
  daysOfWeek,
  formatWeekRangeDetailed,
  buildMonthWeeks,
} = await loadTsModule("lib/study/week.ts");

test("startOfWeek returns Monday for a Wednesday", () => {
  // 2026-07-15 is a Wednesday
  const monday = startOfWeek(new Date("2026-07-15T15:00:00Z"));
  assert.equal(monday, "2026-07-13");
});

test("weekEndFromStart is Sunday of the same week", () => {
  assert.equal(weekEndFromStart("2026-07-13"), "2026-07-19");
});

test("isCurrentWeek matches startOfWeek(now)", () => {
  const now = new Date("2026-07-15T12:00:00Z");
  assert.equal(isCurrentWeek(startOfWeek(now), now), true);
  assert.equal(isCurrentWeek("2026-07-06", now), false);
});

test("weekVisibilityWindow spans seven days", () => {
  const window = weekVisibilityWindow("2026-07-13");
  const from = new Date(window.from).getTime();
  const until = new Date(window.until).getTime();
  assert.equal(until - from, 7 * 24 * 60 * 60 * 1000);
});

test("formatWeekLabel is human readable", () => {
  const label = formatWeekLabel("2026-07-13");
  assert.match(label, /Jul/);
  assert.match(label, /–/);
});

test("shiftWeek moves by seven-day blocks", () => {
  assert.equal(shiftWeek("2026-07-13", 1), "2026-07-20");
  assert.equal(shiftWeek("2026-07-13", -1), "2026-07-06");
});

test("daysOfWeek returns Mon-Sun for a week", () => {
  const days = daysOfWeek("2026-07-13", new Date("2026-07-15T15:00:00Z"));
  assert.equal(days.length, 7);
  assert.equal(days[0].weekdayShort, "Mon");
  assert.equal(days[0].ymd, "2026-07-13");
  assert.equal(days[6].ymd, "2026-07-19");
  assert.equal(days[2].isToday, true); // Wednesday Jul 15
});

test("formatWeekRangeDetailed includes the year", () => {
  const label = formatWeekRangeDetailed("2026-07-13");
  assert.match(label, /Jul 13/);
  assert.match(label, /Jul 19/);
  assert.match(label, /2026/);
});

test("buildMonthWeeks returns full Mon-Sun rows", () => {
  const weeks = buildMonthWeeks("2026-07-01");
  assert.ok(weeks.length >= 4);
  for (const week of weeks) {
    assert.equal(week.length, 7);
    assert.equal(week[0].weekStart, week[0].ymd);
  }
  const mid = weeks.find((week) => week.some((day) => day.ymd === "2026-07-15"));
  assert.ok(mid);
  assert.equal(mid[0].ymd, "2026-07-13");
});
