import { apiFetch } from "./fetch";

import type { UserHighlight } from "@/types/user";

export type CreateHighlightInput = {
  bookId: string | null;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  color?: string | null;
};

export const getUserHighlights = async () =>
  apiFetch<UserHighlight[]>("/api/user/highlights");

export const createUserHighlight = async (payload: CreateHighlightInput) =>
  apiFetch<UserHighlight>("/api/user/highlights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      color: payload.color ?? null,
    }),
  });

export const deleteUserHighlight = async (id: string) =>
  apiFetch<{ success: boolean }>(`/api/user/highlights?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
