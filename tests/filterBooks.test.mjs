import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { loadTsModule } from "./utils/load-ts-module.mjs";

const loadFilter = async () => {
  const mod = await loadTsModule("lib/bible/filterBooks.ts");
  return {
    filterBooks: mod.filterBooks,
    filterComboboxOptions: mod.filterComboboxOptions,
  };
};

const sampleBooks = [
  {
    id: "gen",
    name: "Genesis",
    abbreviation: "Gen",
    chapters: 50,
    order: 1,
  },
  {
    id: "john",
    name: "John",
    abbreviation: "Jn",
    chapters: 21,
    order: 43,
  },
  {
    id: "1cor",
    name: "1 Corinthians",
    abbreviation: "1 Cor",
    chapters: 16,
    order: 46,
  },
  {
    id: "rev",
    name: "Revelation",
    abbreviation: "Rev",
    chapters: 22,
    order: 66,
  },
];

describe("filterBooks", () => {
  it("returns all books for an empty query", async () => {
    const { filterBooks } = await loadFilter();
    assert.equal(filterBooks(sampleBooks, "").length, sampleBooks.length);
    assert.equal(filterBooks(sampleBooks, "   ").length, sampleBooks.length);
  });

  it("matches by name prefix and abbreviation", async () => {
    const { filterBooks } = await loadFilter();
    assert.deepEqual(
      filterBooks(sampleBooks, "gen").map((book) => book.name),
      ["Genesis"],
    );
    assert.deepEqual(
      filterBooks(sampleBooks, "jn").map((book) => book.name),
      ["John"],
    );
  });

  it("matches numbered book aliases", async () => {
    const { filterBooks } = await loadFilter();
    assert.deepEqual(
      filterBooks(sampleBooks, "1 cor").map((book) => book.name),
      ["1 Corinthians"],
    );
    assert.deepEqual(
      filterBooks(sampleBooks, "first corinthians").map((book) => book.name),
      ["1 Corinthians"],
    );
  });
});

describe("filterComboboxOptions", () => {
  it("filters by label and keywords", async () => {
    const { filterComboboxOptions } = await loadFilter();
    const options = [
      { value: "1", label: "Chapter 1", keywords: ["1"] },
      { value: "15", label: "Chapter 15", keywords: ["15"] },
      { value: "50", label: "Chapter 50", keywords: ["50"] },
    ];

    assert.deepEqual(
      filterComboboxOptions(options, "15").map((option) => option.value),
      ["15"],
    );
  });
});
