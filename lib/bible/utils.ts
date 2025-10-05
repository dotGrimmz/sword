export const normaliseBookSlug = (raw: string): string =>
  raw
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

export const toTitleCaseBookName = (value: string): string => {
  if (!value) {
    return value;
  }

  return value
    .split(" ")
    .map((part) => {
      if (/^[0-9]+$/.test(part)) {
        return part;
      }

      if (part.length === 0) {
        return part;
      }

      return part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
};

export const escapeIlikeValue = (value: string): string => value.replace(/'/g, "''");

export const parsePositiveInteger = (value: string): number | null => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

export const parseLimitParam = (
  value: string | null,
  defaultValue: number,
  maxValue: number
): number | null => {
  if (value === null) {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return Math.min(parsed, maxValue);
};
