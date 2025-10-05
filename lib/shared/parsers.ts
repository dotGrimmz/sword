export const toNullableString = (value: unknown): string | null | undefined => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export const toOptionalInteger = (value: unknown): number | null | undefined => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
