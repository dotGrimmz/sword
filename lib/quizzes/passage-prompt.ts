import type {
  BiblePassageResponse,
  BiblePassageVerse,
} from "@/types/bible";

/** Full text is fine for short/medium passages; larger spans use overview sampling. */
export const FULL_PROMPT_VERSE_LIMIT = 80;

/** Soft cap on verses sent to the model for book/section overviews. */
export const OVERVIEW_SAMPLE_VERSE_LIMIT = 120;

/** Prefer a few verses from each chapter so coverage spans the book. */
export const OVERVIEW_VERSES_PER_CHAPTER = 4;

export type PassagePromptPayload = {
  text: string;
  overview: boolean;
  sampledVerseCount: number;
  totalVerseCount: number;
  chapterCount: number;
};

const groupVersesByChapter = (verses: BiblePassageVerse[]) => {
  const byChapter = new Map<number, BiblePassageVerse[]>();
  for (const verse of verses) {
    const list = byChapter.get(verse.chapter) ?? [];
    list.push(verse);
    byChapter.set(verse.chapter, list);
  }
  return byChapter;
};

/**
 * Pick evenly spaced verses from a chapter so overview quizzes cover
 * beginning, middle, and end rather than only the opening lines.
 */
export function sampleChapterVerses(
  chapterVerses: BiblePassageVerse[],
  limit = OVERVIEW_VERSES_PER_CHAPTER,
): BiblePassageVerse[] {
  if (chapterVerses.length <= limit) {
    return chapterVerses;
  }

  if (limit <= 1) {
    return [chapterVerses[0]];
  }

  const sampled: BiblePassageVerse[] = [];
  const lastIndex = chapterVerses.length - 1;
  for (let i = 0; i < limit; i += 1) {
    const index =
      i === limit - 1
        ? lastIndex
        : Math.round((i * lastIndex) / (limit - 1));
    const verse = chapterVerses[index];
    if (!sampled.some((item) => item.verse === verse.verse)) {
      sampled.push(verse);
    }
  }
  return sampled;
}

export function isOverviewPassage(passage: BiblePassageResponse): boolean {
  const chapterSpan =
    passage.range.end.chapter - passage.range.start.chapter + 1;
  return (
    passage.verses.length > FULL_PROMPT_VERSE_LIMIT || chapterSpan >= 4
  );
}

const formatVerseLine = (verse: BiblePassageVerse) =>
  `${verse.chapter}:${verse.verse} ${verse.text.trim()}`;

/**
 * Build the scripture block for the quiz generation prompt.
 * Short ranges get the full text; book-scale ranges get a stratified sample
 * so Genesis-sized requests stay within model context.
 */
export function buildPassagePromptPayload(
  passage: BiblePassageResponse,
): PassagePromptPayload {
  const totalVerseCount = passage.verses.length;
  const byChapter = groupVersesByChapter(passage.verses);
  const chapterCount = byChapter.size;

  if (!isOverviewPassage(passage)) {
    return {
      text: passage.verses.map(formatVerseLine).join("\n"),
      overview: false,
      sampledVerseCount: totalVerseCount,
      totalVerseCount,
      chapterCount,
    };
  }

  const perChapter = Math.max(
    1,
    Math.min(
      OVERVIEW_VERSES_PER_CHAPTER,
      Math.floor(OVERVIEW_SAMPLE_VERSE_LIMIT / Math.max(chapterCount, 1)),
    ),
  );

  const sampled: BiblePassageVerse[] = [];
  const chapterNumbers = [...byChapter.keys()].sort((a, b) => a - b);
  for (const chapter of chapterNumbers) {
    sampled.push(
      ...sampleChapterVerses(byChapter.get(chapter) ?? [], perChapter),
    );
  }

  const capped = sampled.slice(0, OVERVIEW_SAMPLE_VERSE_LIMIT);
  const lines: string[] = [
    `[Overview sample: ${capped.length} of ${totalVerseCount} verses across ${chapterCount} chapters. Questions should cover the arc of the whole range.]`,
  ];

  let currentChapter: number | null = null;
  for (const verse of capped) {
    if (verse.chapter !== currentChapter) {
      currentChapter = verse.chapter;
      lines.push(`--- Chapter ${currentChapter} ---`);
    }
    lines.push(formatVerseLine(verse));
  }

  return {
    text: lines.join("\n"),
    overview: true,
    sampledVerseCount: capped.length,
    totalVerseCount,
    chapterCount,
  };
}
