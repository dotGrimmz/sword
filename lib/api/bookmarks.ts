import { apiFetch } from "./fetch";

import type { UserBookmark } from "@/types/user";

export type UpsertBookmarkInput = {
  bookId: string;
  chapter: number;
  verse?: number | null;
  label?: string | null;
};

export const getUserBookmarks = async () =>
  apiFetch<UserBookmark[]>("/api/user/bookmarks");

export const upsertUserBookmark = async (payload: UpsertBookmarkInput) =>
  apiFetch<UserBookmark>("/api/user/bookmarks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      hasVerse: Object.prototype.hasOwnProperty.call(payload, "verse"),
      hasLabel: Object.prototype.hasOwnProperty.call(payload, "label"),
    }),
  });

export const deleteUserBookmark = async (id: string) =>
  apiFetch<{ success: boolean }>(`/api/user/bookmarks?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
