import { apiFetch } from "./fetch";

import type { UserMemoryVerse } from "@/types/user";

export type CreateMemoryVerseInput = {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number | null;
  label?: string | null;
  tags?: string[] | null;
};

export const getUserMemoryVerses = async () =>
  apiFetch<UserMemoryVerse[]>("/api/user/memory");

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
