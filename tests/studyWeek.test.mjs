import assert from "node:assert/strict";
import test from "node:test";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const {
  startOfWeek,
  weekEndFromStart,
  isCurrentWeek,
  formatWeekLabel,
  weekVisibilityWindow,
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
