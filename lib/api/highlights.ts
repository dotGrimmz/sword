import { apiFetch } from "./fetch";

import type { UserHighlight } from "@/types/user";

export type CreateHighlightInput = {
  translationId?: string | null;
  bookId: string | null;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  color?: string | null;
};

export const getUserHighlights = async (translationCode?: string) => {
  const params = new URLSearchParams();

  if (translationCode) {
    params.set("translation", translationCode);
  }

  const query = params.toString();
  const resource =
    query.length > 0 ? `/api/user/highlights?${query}` : "/api/user/highlights";

  return apiFetch<UserHighlight[]>(resource);
};

export const createUserHighlight = async (payload: CreateHighlightInput) =>
  apiFetch<UserHighlight>("/api/user/highlights", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      translationId: payload.translationId ?? null,
      color: payload.color ?? null,
    }),
  });

export const deleteUserHighlight = async (id: string) =>
  apiFetch<{ success: boolean }>(`/api/user/highlights?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
