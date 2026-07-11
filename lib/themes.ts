export const THEME_VALUES = [
  "realign",
  "ocean",
  "sunset",
  "forest",
  "purple",
  "cherry",
] as const;

export type Theme = (typeof THEME_VALUES)[number];

export const DEFAULT_THEME: Theme = "realign";

export function isTheme(value: string | null | undefined): value is Theme {
  return !!value && (THEME_VALUES as readonly string[]).includes(value);
}

/**
 * Prefer Realign for the redesign rollout: stored/profile "ocean"
 * (the previous default) maps to realign so existing accounts pick up the brand.
 */
export function resolveTheme(value: string | null | undefined): Theme {
  if (!isTheme(value) || value === "ocean") {
    return DEFAULT_THEME;
  }
  return value;
}
