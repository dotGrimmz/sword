import { apiFetch } from "./fetch";

import type {
  CreateUserNotePayload,
  UpdateUserNotePayload,
  UserNote,
} from "@/types/user";

export const getUserNotes = async (
  limit?: number,
  translationCode?: string
) => {
  const params = new URLSearchParams();

  if (typeof limit === "number") {
    params.set("limit", `${limit}`);
  }

  if (translationCode) {
    params.set("translation", translationCode);
  }

  const query = params.toString();
  const resource = query.length > 0 ? `/api/user/notes?${query}` : "/api/user/notes";

  return apiFetch<UserNote[]>(resource);
};

export const createUserNote = async (payload: CreateUserNotePayload) =>
  apiFetch<UserNote>("/api/user/notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const updateUserNote = async (id: string, payload: UpdateUserNotePayload) =>
  apiFetch<UserNote>(`/api/user/notes/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const deleteUserNote = async (id: string) =>
  apiFetch<{ success: boolean }>(`/api/user/notes/${id}`, {
    method: "DELETE",
  });
