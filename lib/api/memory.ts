import { apiFetch } from "./fetch";

import type { UserMemoryVerse } from "@/types/user";

export type CreateMemoryVerseInput = {
  translationId?: string | null;
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number | null;
  label?: string | null;
  tags?: string[] | null;
};

export const getUserMemoryVerses = async (translationCode?: string) => {
  const params = new URLSearchParams();

  if (translationCode) {
    params.set("translation", translationCode);
  }

  const query = params.toString();
  const resource =
    query.length > 0 ? `/api/user/memory?${query}` : "/api/user/memory";

  return apiFetch<UserMemoryVerse[]>(resource);
};

export type ReviewMemoryVerseInput = {
  id: string;
  rating: "again" | "good" | "easy";
};

export const createUserMemoryVerse = async (payload: CreateMemoryVerseInput) =>
  apiFetch<UserMemoryVerse>("/api/user/memory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      translationId: payload.translationId ?? null,
      verseEnd: payload.verseEnd ?? payload.verseStart,
      label: payload.label ?? null,
      tags: payload.tags ?? null,
    }),
  });

export const deleteUserMemoryVerse = async (id: string) =>
  apiFetch<{ success: boolean }>(`/api/user/memory?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export const reviewUserMemoryVerse = async (payload: ReviewMemoryVerseInput) =>
  apiFetch<UserMemoryVerse>("/api/user/memory", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
