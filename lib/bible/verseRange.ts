export function formatVerseRange(start: number, end: number): string {
  if (start === end) {
    return String(start);
  }
  return `${start}-${end}`;
}

export function parseVerseRangeValue(
  value: string,
): { start: number; end: number } | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const match = normalized.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) {
    return null;
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : start;
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start <= 0 ||
    end < start
  ) {
    return null;
  }
  return { start, end };
}
