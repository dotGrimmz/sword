import { apiFetch } from "./fetch";

import type { UserBookmark } from "@/types/user";

export type UpsertBookmarkInput = {
  translationId?: string | null;
  bookId: string;
  chapter: number;
  verse?: number | null;
  label?: string | null;
};

export const getUserBookmarks = async (translationCode?: string) => {
  const params = new URLSearchParams();

  if (translationCode) {
    params.set("translation", translationCode);
  }

  const query = params.toString();
  const resource =
    query.length > 0 ? `/api/user/bookmarks?${query}` : "/api/user/bookmarks";

  return apiFetch<UserBookmark[]>(resource);
};

export const upsertUserBookmark = async (payload: UpsertBookmarkInput) =>
  apiFetch<UserBookmark>("/api/user/bookmarks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      translationId: payload.translationId ?? null,
      hasVerse: Object.prototype.hasOwnProperty.call(payload, "verse"),
      hasLabel: Object.prototype.hasOwnProperty.call(payload, "label"),
    }),
  });

export const deleteUserBookmark = async (id: string) =>
  apiFetch<{ success: boolean }>(`/api/user/bookmarks?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
