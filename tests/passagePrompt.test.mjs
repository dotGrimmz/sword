import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const loadPassagePrompt = async () =>
  loadTsModule("lib/quizzes/passage-prompt.ts");

const loadSuggestCount = async () =>
  loadTsModule("lib/quizzes/suggest-count.ts");

const makePassage = ({
  chapters,
  versesPerChapter = 10,
}) => {
  const verses = [];
  for (let chapter = 1; chapter <= chapters; chapter += 1) {
    for (let verse = 1; verse <= versesPerChapter; verse += 1) {
      verses.push({
        chapter,
        verse,
        text: `Chapter ${chapter} verse ${verse} text.`,
      });
    }
  }

  return {
    translation: { code: "WEB", name: "World English Bible" },
    book: {
      id: "genesis",
      name: "Genesis",
      abbreviation: "Gen",
      chapters,
    },
    range: {
      start: { chapter: 1, verse: 1 },
      end: { chapter: chapters, verse: versesPerChapter },
    },
    verses,
  };
};

describe("passage prompt overview sampling", () => {
  it("keeps short passages as full text", async () => {
    const { buildPassagePromptPayload, isOverviewPassage } =
      await loadPassagePrompt();
    const passage = makePassage({ chapters: 1, versesPerChapter: 20 });

    assert.equal(isOverviewPassage(passage), false);
    const payload = buildPassagePromptPayload(passage);
    assert.equal(payload.overview, false);
    assert.equal(payload.sampledVerseCount, 20);
    assert.match(payload.text, /^1:1 /);
    assert.doesNotMatch(payload.text, /Overview sample/);
  });

  it("samples evenly across many chapters for book overviews", async () => {
    const {
      buildPassagePromptPayload,
      isOverviewPassage,
      OVERVIEW_SAMPLE_VERSE_LIMIT,
    } = await loadPassagePrompt();
    const passage = makePassage({ chapters: 50, versesPerChapter: 30 });

    assert.equal(isOverviewPassage(passage), true);
    const payload = buildPassagePromptPayload(passage);
    assert.equal(payload.overview, true);
    assert.equal(payload.totalVerseCount, 1500);
    assert.ok(payload.sampledVerseCount <= OVERVIEW_SAMPLE_VERSE_LIMIT);
    assert.ok(payload.sampledVerseCount < payload.totalVerseCount);
    assert.match(payload.text, /Overview sample/);
    assert.match(payload.text, /--- Chapter 1 ---/);
    assert.match(payload.text, /--- Chapter 50 ---/);
  });

  it("samples beginning and end within a chapter", async () => {
    const { sampleChapterVerses } = await loadPassagePrompt();
    const chapterVerses = Array.from({ length: 10 }, (_v, i) => ({
      chapter: 3,
      verse: i + 1,
      text: `v${i + 1}`,
    }));

    const sampled = sampleChapterVerses(chapterVerses, 4);
    assert.equal(sampled[0].verse, 1);
    assert.equal(sampled[sampled.length - 1].verse, 10);
    assert.equal(sampled.length, 4);
  });
});

describe("suggestQuizQuestionCount for book spans", () => {
  it("suggests a fuller quiz for entire-book sized ranges", async () => {
    const { suggestQuizQuestionCount, QUIZ_QUESTION_COUNT_BOUNDS } =
      await loadSuggestCount();

    const bookCount = suggestQuizQuestionCount({
      verseCount: 1500,
      chapterCount: 50,
      difficulty: "medium",
      focus: "mixed",
      questionTypes: ["multiple_choice", "short_answer"],
    });

    assert.ok(bookCount >= 16);
    assert.ok(bookCount <= QUIZ_QUESTION_COUNT_BOUNDS.max);
  });

  it("still keeps short passages small", async () => {
    const { suggestQuizQuestionCount } = await loadSuggestCount();
    const shortCount = suggestQuizQuestionCount({
      verseCount: 4,
      chapterCount: 1,
      difficulty: "medium",
      focus: "factual",
      questionTypes: ["multiple_choice"],
    });
    assert.equal(shortCount, 3);
  });
});
