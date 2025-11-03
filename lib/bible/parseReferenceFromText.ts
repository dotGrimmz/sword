export type ParsedReference = {
  book: string | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  bodyText: string;
};

type BookAlias = {
  name: string;
  aliases: string[];
};

const BASE_BOOKS: Array<{ name: string; aliases?: string[] }> = [
  { name: "Genesis", aliases: ["gen", "genesis"] },
  { name: "Exodus", aliases: ["ex", "exo", "exodus"] },
  { name: "Leviticus", aliases: ["lev", "leviticus"] },
  { name: "Numbers", aliases: ["num", "numbers"] },
  { name: "Deuteronomy", aliases: ["deut", "deuteronomy"] },
  { name: "Joshua", aliases: ["josh", "joshua"] },
  { name: "Judges", aliases: ["judg", "judges"] },
  { name: "Ruth" },
  { name: "1 Samuel", aliases: ["1 samuel", "first samuel", "1 sam"] },
  { name: "2 Samuel", aliases: ["2 samuel", "second samuel", "2 sam"] },
  { name: "1 Kings", aliases: ["1 kings", "first kings", "1 kgs"] },
  { name: "2 Kings", aliases: ["2 kings", "second kings", "2 kgs"] },
  { name: "1 Chronicles", aliases: ["1 chronicles", "first chronicles", "1 chron"] },
  { name: "2 Chronicles", aliases: ["2 chronicles", "second chronicles", "2 chron"] },
  { name: "Ezra" },
  { name: "Nehemiah", aliases: ["neh", "nehemiah"] },
  { name: "Esther", aliases: ["est", "esther"] },
  { name: "Job" },
  { name: "Psalm", aliases: ["psalm", "psalms", "ps"] },
  { name: "Proverbs", aliases: ["prov", "proverbs"] },
  { name: "Ecclesiastes", aliases: ["ecclesiastes", "ecc", "eccles"] },
  { name: "Song of Solomon", aliases: ["song of solomon", "song of songs", "songs"] },
  { name: "Isaiah", aliases: ["isa", "isaiah"] },
  { name: "Jeremiah", aliases: ["jer", "jeremiah"] },
  { name: "Lamentations", aliases: ["lam", "lamentations"] },
  { name: "Ezekiel", aliases: ["ezek", "ezekiel"] },
  { name: "Daniel", aliases: ["dan", "daniel"] },
  { name: "Hosea", aliases: ["hos", "hosea"] },
  { name: "Joel" },
  { name: "Amos" },
  { name: "Obadiah", aliases: ["obadiah", "obad"] },
  { name: "Jonah", aliases: ["jonah", "jon"] },
  { name: "Micah", aliases: ["mic", "micah"] },
  { name: "Nahum", aliases: ["nah", "nahum"] },
  { name: "Habakkuk", aliases: ["hab", "habakkuk"] },
  { name: "Zephaniah", aliases: ["zeph", "zephaniah"] },
  { name: "Haggai", aliases: ["hag", "haggai"] },
  { name: "Zechariah", aliases: ["zech", "zechariah"] },
  { name: "Malachi", aliases: ["mal", "malachi"] },
  { name: "Matthew", aliases: ["matt", "matthew"] },
  { name: "Mark" },
  { name: "Luke" },
  { name: "John" },
  { name: "Acts", aliases: ["acts", "acts of the apostles"] },
  { name: "Romans", aliases: ["rom", "romans"] },
  { name: "1 Corinthians", aliases: ["1 corinthians", "first corinthians", "1 cor"] },
  { name: "2 Corinthians", aliases: ["2 corinthians", "second corinthians", "2 cor"] },
  { name: "Galatians", aliases: ["gal", "galatians"] },
  { name: "Ephesians", aliases: ["eph", "ephesians"] },
  { name: "Philippians", aliases: ["phil", "philippians"] },
  { name: "Colossians", aliases: ["col", "colossians"] },
  { name: "1 Thessalonians", aliases: ["1 thessalonians", "first thessalonians", "1 thess"] },
  { name: "2 Thessalonians", aliases: ["2 thessalonians", "second thessalonians", "2 thess"] },
  { name: "1 Timothy", aliases: ["1 timothy", "first timothy", "1 tim"] },
  { name: "2 Timothy", aliases: ["2 timothy", "second timothy", "2 tim"] },
  { name: "Titus" },
  { name: "Philemon", aliases: ["philem", "philemon"] },
  { name: "Hebrews", aliases: ["heb", "hebrews"] },
  { name: "James", aliases: ["jam", "james"] },
  { name: "1 Peter", aliases: ["1 peter", "first peter", "1 pet"] },
  { name: "2 Peter", aliases: ["2 peter", "second peter", "2 pet"] },
  { name: "1 John", aliases: ["1 john", "first john", "1 jn"] },
  { name: "2 John", aliases: ["2 john", "second john", "2 jn"] },
  { name: "3 John", aliases: ["3 john", "third john", "3 jn"] },
  { name: "Jude" },
  { name: "Revelation", aliases: ["rev", "revelation", "revelations"] },
];

const BOOKS: BookAlias[] = BASE_BOOKS.map(({ name, aliases }) => {
  const baseAlias = name.toLowerCase();
  const aliasSet = new Set<string>([baseAlias]);

  if (aliases) {
    aliases.forEach((alias) => aliasSet.add(alias.toLowerCase()));
  }

  if (/^[1-3]/.test(name)) {
    const parts = name.split(" ");
    const number = parts[0];
    const rest = parts.slice(1).join(" ");
    const ordinal = number === "1" ? "first" : number === "2" ? "second" : "third";
    aliasSet.add(`${number} ${rest}`.toLowerCase());
    aliasSet.add(`${ordinal} ${rest}`.toLowerCase());
  }

  return {
    name,
    aliases: Array.from(aliasSet).sort((a, b) => b.length - a.length),
  };
});

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

  let matchedBook: BookAlias | null = null;
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
