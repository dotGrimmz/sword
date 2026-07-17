import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const loadHelpers = async () => {
  const mod = await loadTsModule("lib/bible/verseRange.ts");
  return {
    formatVerseRange: mod.formatVerseRange,
    parseVerseRangeValue: mod.parseVerseRangeValue,
  };
};

describe("verseRange helpers", () => {
  it("formats single and ranged verses", async () => {
    const { formatVerseRange } = await loadHelpers();
    assert.equal(formatVerseRange(5, 5), "5");
    assert.equal(formatVerseRange(1, 26), "1-26");
  });

  it("parses verse range strings", async () => {
    const { parseVerseRangeValue } = await loadHelpers();
    assert.deepEqual(parseVerseRangeValue("1-26"), { start: 1, end: 26 });
    assert.deepEqual(parseVerseRangeValue("5"), { start: 5, end: 5 });
    assert.equal(parseVerseRangeValue(""), null);
    assert.equal(parseVerseRangeValue("nope"), null);
  });
});
