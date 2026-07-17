"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createUserNote,
  deleteUserNote,
  getUserNotes,
  updateUserNote,
} from "@/lib/api/notes";
import { dispatchNotesUpdated } from "@/lib/events";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import type {
  CreateUserNotePayload,
  UpdateUserNotePayload,
  UserNote,
} from "@/types/user";

export const useNotesQuery = (
  translationCode: string | null | undefined,
  options?: { limit?: number; preview?: boolean },
) => {
  const translationKey = translationCode ?? "none";
  const preview = options?.preview ?? false;
  const limit = options?.limit;

  return useQuery({
    queryKey: preview
      ? queryKeys.userNotesPreview(translationKey)
      : queryKeys.userNotes(translationKey),
    queryFn: () => getUserNotes(limit, translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: Boolean(translationCode),
  });
};

const invalidateNotesKeys = (
  queryClient: ReturnType<typeof useQueryClient>,
  translationKey: string,
) => {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.userNotes(translationKey),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.userNotesPreview(translationKey),
  });
};

export const useCreateNoteMutation = (
  translationCode: string | null | undefined,
  source = "notes-screen",
) => {
  const queryClient = useQueryClient();
  const translationKey = translationCode ?? "none";
  const key = queryKeys.userNotes(translationKey);

  return useMutation({
    mutationFn: (payload: CreateUserNotePayload) => createUserNote(payload),
    onSuccess: (created) => {
      queryClient.setQueryData<UserNote[]>(key, (prev) => [
        created,
        ...(prev ?? []),
      ]);
      invalidateNotesKeys(queryClient, translationKey);
      dispatchNotesUpdated({ source });
    },
  });
};

export const useUpdateNoteMutation = (
  translationCode: string | null | undefined,
  source = "notes-screen",
) => {
  const queryClient = useQueryClient();
  const translationKey = translationCode ?? "none";
  const key = queryKeys.userNotes(translationKey);

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateUserNotePayload;
    }) => updateUserNote(id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<UserNote[]>(key, (prev) =>
        (prev ?? []).map((item) => (item.id === updated.id ? updated : item)),
      );
      invalidateNotesKeys(queryClient, translationKey);
      dispatchNotesUpdated({ source });
    },
  });
};

export const useDeleteNoteMutation = (
  translationCode: string | null | undefined,
  source = "notes-screen",
) => {
  const queryClient = useQueryClient();
  const translationKey = translationCode ?? "none";
  const key = queryKeys.userNotes(translationKey);

  return useMutation({
    mutationFn: (note: UserNote) => deleteUserNote(note.id),
    onMutate: async (note) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserNote[]>(key);
      queryClient.setQueryData<UserNote[]>(key, (prev) =>
        (prev ?? []).filter((item) => item.id !== note.id),
      );
      return { previous };
    },
    onError: (_error, _note, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: () => {
      invalidateNotesKeys(queryClient, translationKey);
      dispatchNotesUpdated({ source });
    },
  });
};
