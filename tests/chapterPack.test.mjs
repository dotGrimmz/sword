import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const load = async () => loadTsModule("lib/quizzes/chapter-pack.ts");

describe("chapter pack planning", () => {
  it("plans one job per chapter", async () => {
    const { planChapterPack } = await load();
    const plan = planChapterPack({
      book: "Genesis",
      translation: "WEB",
      chapterCount: 3,
    });
    assert.equal(plan.chapterCount, 3);
    assert.equal(plan.jobs.length, 3);
    assert.deepEqual(
      plan.jobs.map((job) => job.chapter),
      [1, 2, 3],
    );
    assert.equal(plan.jobs[1].titleHint, "Genesis 2");
  });

  it("detects existing single-chapter quizzes", async () => {
    const { hasExistingChapterQuiz } = await load();
    const quizzes = [
      {
        book: "Genesis",
        translation_code: "WEB",
        start_chapter: 12,
        end_chapter: 12,
        status: "draft",
      },
      {
        book: "Genesis",
        translation_code: "WEB",
        start_chapter: 1,
        end_chapter: 3,
        status: "published",
      },
      {
        book: "Genesis",
        translation_code: "WEB",
        start_chapter: 5,
        end_chapter: 5,
        status: "archived",
      },
    ];

    assert.equal(
      hasExistingChapterQuiz(quizzes, {
        book: "Genesis",
        translation: "web",
        chapter: 12,
      }),
      true,
    );
    assert.equal(
      hasExistingChapterQuiz(quizzes, {
        book: "Genesis",
        translation: "WEB",
        chapter: 1,
      }),
      false,
    );
    assert.equal(
      hasExistingChapterQuiz(quizzes, {
        book: "Genesis",
        translation: "WEB",
        chapter: 5,
      }),
      false,
    );
  });
});
