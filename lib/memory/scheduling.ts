export type ReviewRating = "again" | "good" | "easy";

export const REVIEW_RATINGS: readonly ReviewRating[] = ["again", "good", "easy"] as const;

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_EASE = 3.0;
export const INITIAL_INTERVAL_DAYS = 1;

const EASY_BONUS = 1.3;
const QUALITY_MAP: Record<ReviewRating, number> = {
  again: 2,
  good: 4,
  easy: 5,
};

const FIRST_INTERVALS: Record<ReviewRating, number> = {
  again: 1,
  good: 3,
  easy: 5,
};

export type SchedulingInput = {
  ease?: number | null;
  intervalDays?: number | null;
};

export type SchedulingResult = {
  ease: number;
  intervalDays: number;
  nextReviewDate: string;
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const computeEase = (currentEase: number, rating: ReviewRating) => {
  const quality = QUALITY_MAP[rating];
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  return clamp(currentEase + delta, MIN_EASE, MAX_EASE);
};

const computeInterval = (previousInterval: number, rating: ReviewRating, ease: number) => {
  if (previousInterval <= 0) {
    return FIRST_INTERVALS[rating];
  }

  if (rating === "again") {
    return 1;
  }

  if (rating === "good") {
    return Math.max(2, Math.round(previousInterval * ease));
  }

  return Math.max(3, Math.round(previousInterval * ease * EASY_BONUS));
};

export const calculateNextReview = (
  source: SchedulingInput,
  rating: ReviewRating,
  baseDate = new Date()
): SchedulingResult => {
  const startingEase = source.ease ?? INITIAL_EASE;
  const startingInterval = source.intervalDays ?? 0;

  const nextEase = computeEase(startingEase, rating);
  const nextInterval = clamp(computeInterval(startingInterval, rating, nextEase), 1, 3650);
  const nextReviewDate = new Date(baseDate.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    ease: nextEase,
    intervalDays: nextInterval,
    nextReviewDate: nextReviewDate.toISOString(),
  };
};
