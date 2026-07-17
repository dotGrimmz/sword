/**
 * Shared book name → alias list used for speech parsing and typeahead matching.
 * Keep aliases lowercase; callers should normalise query text the same way.
 */

export type BookAliasEntry = {
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
  {
    name: "1 Chronicles",
    aliases: ["1 chronicles", "first chronicles", "1 chron"],
  },
  {
    name: "2 Chronicles",
    aliases: ["2 chronicles", "second chronicles", "2 chron"],
  },
  { name: "Ezra" },
  { name: "Nehemiah", aliases: ["neh", "nehemiah"] },
  { name: "Esther", aliases: ["est", "esther"] },
  { name: "Job" },
  { name: "Psalm", aliases: ["psalm", "psalms", "ps"] },
  { name: "Proverbs", aliases: ["prov", "proverbs"] },
  { name: "Ecclesiastes", aliases: ["ecclesiastes", "ecc", "eccles"] },
  {
    name: "Song of Solomon",
    aliases: ["song of solomon", "song of songs", "songs"],
  },
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
  {
    name: "1 Corinthians",
    aliases: ["1 corinthians", "first corinthians", "1 cor"],
  },
  {
    name: "2 Corinthians",
    aliases: ["2 corinthians", "second corinthians", "2 cor"],
  },
  { name: "Galatians", aliases: ["gal", "galatians"] },
  { name: "Ephesians", aliases: ["eph", "ephesians"] },
  { name: "Philippians", aliases: ["phil", "philippians"] },
  { name: "Colossians", aliases: ["col", "colossians"] },
  {
    name: "1 Thessalonians",
    aliases: ["1 thessalonians", "first thessalonians", "1 thess"],
  },
  {
    name: "2 Thessalonians",
    aliases: ["2 thessalonians", "second thessalonians", "2 thess"],
  },
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

function buildAliases(name: string, extras?: string[]): string[] {
  const aliasSet = new Set<string>([name.toLowerCase()]);

  if (extras) {
    extras.forEach((alias) => aliasSet.add(alias.toLowerCase()));
  }

  if (/^[1-3]/.test(name)) {
    const parts = name.split(" ");
    const number = parts[0];
    const rest = parts.slice(1).join(" ");
    const ordinal =
      number === "1" ? "first" : number === "2" ? "second" : "third";
    aliasSet.add(`${number} ${rest}`.toLowerCase());
    aliasSet.add(`${ordinal} ${rest}`.toLowerCase());
  }

  return Array.from(aliasSet).sort((a, b) => b.length - a.length);
}

export const BOOK_ALIASES: BookAliasEntry[] = BASE_BOOKS.map(
  ({ name, aliases }) => ({
    name,
    aliases: buildAliases(name, aliases),
  }),
);

const ALIASES_BY_NAME = new Map(
  BOOK_ALIASES.map((entry) => [entry.name.toLowerCase(), entry.aliases]),
);

/** Returns lowercase aliases for a canonical book name (empty if unknown). */
export function getAliasesForBookName(name: string): string[] {
  return ALIASES_BY_NAME.get(name.toLowerCase()) ?? [name.toLowerCase()];
}
