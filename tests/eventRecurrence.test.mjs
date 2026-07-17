import assert from "node:assert/strict";
import test from "node:test";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const { generateOccurrences, formatRecurrenceSummary } = await loadTsModule(
  "lib/church-events/recurrence.ts",
);

test("one-time recurrence yields a single occurrence", () => {
  const rows = generateOccurrences({
    starts_at: "2026-07-20T23:00:00.000Z",
    ends_at: "2026-07-21T00:00:00.000Z",
    recurrence_frequency: "none",
    recurrence_interval: 1,
    recurrence_weekdays: null,
    recurrence_end_type: "never",
    recurrence_until: null,
    recurrence_count: null,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].starts_at, "2026-07-20T23:00:00.000Z");
});

test("weekly count recurrence respects count cap", () => {
  const rows = generateOccurrences({
    starts_at: "2026-07-20T23:00:00.000Z",
    ends_at: null,
    recurrence_frequency: "weekly",
    recurrence_interval: 1,
    recurrence_weekdays: null,
    recurrence_end_type: "count",
    recurrence_until: null,
    recurrence_count: 4,
  });
  assert.equal(rows.length, 4);
});

test("formatRecurrenceSummary describes weekly series", () => {
  const label = formatRecurrenceSummary({
    recurrence_frequency: "weekly",
    recurrence_interval: 1,
    recurrence_weekdays: null,
    recurrence_end_type: "never",
    recurrence_until: null,
    recurrence_count: null,
  });
  assert.equal(label, "Every week");
});
