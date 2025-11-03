import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const loadParser = async () => {
  const mod = await loadTsModule("lib/bible/parseReferenceFromText.ts");
  return mod.parseReferenceFromText;
};

describe("parseReferenceFromText", () => {
  it("parses numeric chapter and verse references", async () => {
    const parseReferenceFromText = await loadParser();
    const result = parseReferenceFromText("Romans 8 verse 28 God works all things");

    assert.equal(result.book, "Romans");
    assert.equal(result.chapter, 8);
    assert.equal(result.verseStart, 28);
    assert.equal(result.verseEnd, 28);
    assert.equal(
      result.bodyText,
      "God works all things",
      "Remaining text should be treated as body"
    );
  });

  it("parses spoken numbers for chapter and verse", async () => {
    const parseReferenceFromText = await loadParser();
    const result = parseReferenceFromText(
      "First John chapter four verse seven love one another"
    );

    assert.equal(result.book, "1 John");
    assert.equal(result.chapter, 4);
    assert.equal(result.verseStart, 7);
    assert.equal(result.verseEnd, 7);
    assert.equal(result.bodyText, "love one another");
  });

  it("parses ranges and returns verse end", async () => {
    const parseReferenceFromText = await loadParser();
    const result = parseReferenceFromText(
      "Psalm twenty three verses one through three the Lord is my shepherd"
    );

    assert.equal(result.book, "Psalm");
    assert.equal(result.chapter, 23);
    assert.equal(result.verseStart, 1);
    assert.equal(result.verseEnd, 3);
    assert.equal(result.bodyText, "the Lord is my shepherd");
  });

  it("falls back to body text when reference missing", async () => {
    const parseReferenceFromText = await loadParser();
    const result = parseReferenceFromText("Just reflecting on God's faithfulness today");

    assert.equal(result.book, null);
    assert.equal(result.chapter, null);
    assert.equal(result.verseStart, null);
    assert.equal(result.verseEnd, null);
    assert.equal(result.bodyText, "Just reflecting on God's faithfulness today");
  });
});
