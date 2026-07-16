import {
  BOOK_ALIASES,
  type BookAliasEntry,
} from "./bookAliases";

export type ParsedReference = {
  book: string | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  bodyText: string;
};

const BOOKS: BookAliasEntry[] = BOOK_ALIASES;

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

const normaliseText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseWordNumber = (value: string): number | null => {
  const tokens = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, " ")
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  let total = 0;
  let current = 0;

  for (const token of tokens) {
    if (token === "and") continue;

    if (/^\d+$/.test(token)) {
      current += Number(token);
      continue;
    }

    const mapped = NUMBER_WORDS[token];
    if (mapped !== undefined) {
      if (token === "hundred") {
        current = current === 0 ? 100 : current * 100;
      } else {
        current += mapped;
      }
      continue;
    }

    return null;
  }

  total += current;
  return total > 0 ? total : null;
};

const parseNumericToken = (value: string | undefined | null): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return parseWordNumber(trimmed);
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parseReferenceFromText = (transcript: string): ParsedReference => {
  const original = transcript.trim();
  if (!original) {
    return {
      book: null,
      chapter: null,
      verseStart: null,
      verseEnd: null,
      bodyText: "",
    };
  }

  const lower = normaliseText(original);
  const originalLower = original.toLowerCase();

  let matchedBook: BookAliasEntry | null = null;
  let matchedAlias: string | null = null;
  let matchIndex = Number.POSITIVE_INFINITY;

  for (const book of BOOKS) {
    for (const alias of book.aliases) {
      const pattern = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
      const match = pattern.exec(lower);
      if (match) {
        const lowerAlias = alias.toLowerCase();
        const originalIndex = originalLower.indexOf(lowerAlias);
        const candidateIndex =
          originalIndex !== -1 ? originalIndex : match.index;

        const isBetterMatch =
          matchedBook === null ||
          candidateIndex < matchIndex ||
          (candidateIndex === matchIndex &&
            alias.length > (matchedAlias?.length ?? 0));

        if (isBetterMatch) {
          matchedBook = book;
          matchIndex = candidateIndex;
          matchedAlias = original.slice(
            candidateIndex,
            candidateIndex + alias.length
          );
        }
      }
    }
  }

  if (!matchedBook || !Number.isFinite(matchIndex) || !matchedAlias) {
    return {
      book: null,
      chapter: null,
      verseStart: null,
      verseEnd: null,
      bodyText: original,
    };
  }

  const before = original.slice(0, matchIndex);
  const after = original.slice(matchIndex + matchedAlias.length);
  const afterLower = after.toLowerCase();
  const afterNormalized = normaliseText(after);

  const tokenisedAfter = afterNormalized
    .split(" ")
    .filter(Boolean)
    .flatMap((token) => {
      if (token.includes(":")) {
        const [left, right] = token.split(":");
        const parts = [];
        if (left) parts.push(left);
        parts.push(":");
        if (right) parts.push(right);
        return parts;
      }
      if (/^\d+-\d+$/.test(token)) {
        const [start, end] = token.split("-");
        return [start, "-", end];
      }
      return [token];
    });

  let pointer = 0;
  let chapter: number | null = null;
  let verseStart: number | null = null;
  let verseEnd: number | null = null;

  const peekToken = () => tokenisedAfter[pointer];
  const advanceToken = () => {
    const current = tokenisedAfter[pointer];
    pointer += 1;
    return current;
  };

  const consumeNumberTokens = (): { tokens: string[]; start: number } => {
    const start = pointer;
    const collected: string[] = [];
    while (pointer < tokenisedAfter.length) {
      const token = tokenisedAfter[pointer];
      if (
        token === ":" ||
        token === "-" ||
        token === "to" ||
        token === "through" ||
        token === "verse" ||
        token === "verses"
      ) {
        break;
      }
      if (token === "and") {
        pointer += 1;
        continue;
      }
      if (!/^\d+$/.test(token) && NUMBER_WORDS[token] === undefined) {
        break;
      }
      collected.push(token);
      pointer += 1;
    }
    return { tokens: collected, start };
  };

  if (peekToken() === "chapter") {
    advanceToken();
  }

  const chapterTokens = consumeNumberTokens();
  if (chapterTokens.tokens.length > 0) {
    const value = parseNumericToken(chapterTokens.tokens.join(" "));
    if (value !== null && value > 0) {
      chapter = value;
    } else {
      pointer = chapterTokens.start;
    }
  }

  const next = peekToken();
  if (next === ":" || next === "verse" || next === "verses") {
    advanceToken();
  } else if (
    chapter !== null &&
    next !== undefined &&
    (/^\d+$/.test(next) || NUMBER_WORDS[next] !== undefined)
  ) {
    // continue without explicit separator for spoken formats like "Romans 8 28"
  } else {
    // No verse information present.
  }

  const verseTokens = consumeNumberTokens();
  if (verseTokens.tokens.length > 0) {
    const value = parseNumericToken(verseTokens.tokens.join(" "));
    if (value !== null && value > 0) {
      verseStart = value;
      verseEnd = value;
    } else {
      pointer = verseTokens.start;
    }
  }

  if (
    verseStart !== null &&
    pointer < tokenisedAfter.length &&
    (tokenisedAfter[pointer] === "-" ||
      tokenisedAfter[pointer] === "to" ||
      tokenisedAfter[pointer] === "through")
  ) {
    advanceToken();
    const rangeTokens = consumeNumberTokens();
    if (rangeTokens.tokens.length > 0) {
      const value = parseNumericToken(rangeTokens.tokens.join(" "));
      if (value !== null && value >= verseStart) {
        verseEnd = value;
      }
    }
  }

  if (verseStart !== null && verseEnd === null) {
    verseEnd = verseStart;
  }

  const consumedTokens = tokenisedAfter.slice(0, pointer);
  const normalisedReference = consumedTokens.join(" ").trim();

  let consumedLength = 0;
  if (normalisedReference.length > 0) {
    const compactReference = normalisedReference
      .replace(/\s*:\s*/g, ":")
      .replace(/\s*-\s*/g, "-")
      .trim();

    const referenceIndex = afterLower.indexOf(compactReference);
    if (referenceIndex !== -1) {
      consumedLength = referenceIndex + compactReference.length;
    } else {
      consumedLength = after.length;
    }
  }

  const remaining = after.slice(consumedLength).trim();
  const bodyParts = [];
  if (before.trim().length > 0) {
    bodyParts.push(before.trim());
  }
  if (remaining.length > 0) {
    bodyParts.push(remaining);
  }
  const bodyText = bodyParts.join(" ").replace(/\s+/g, " ").trim();

  return {
    book: matchedBook.name,
    chapter,
    verseStart,
    verseEnd,
    bodyText: bodyText.length > 0 ? bodyText : original,
  };
};
