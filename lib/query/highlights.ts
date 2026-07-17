"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createUserHighlight,
  deleteUserHighlight,
  getUserHighlights,
  type CreateHighlightInput,
} from "@/lib/api/highlights";
import { dispatchHighlightsUpdated } from "@/lib/events";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import type { UserHighlight } from "@/types/user";

export const useHighlightsQuery = (
  translationCode: string | null | undefined,
) => {
  const translationKey = translationCode ?? "none";
  return useQuery({
    queryKey: queryKeys.userHighlights(translationKey),
    queryFn: () => getUserHighlights(translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: Boolean(translationCode),
  });
};

export const useCreateHighlightMutation = (
  translationCode: string | null | undefined,
  source = "highlights-screen",
) => {
  const queryClient = useQueryClient();
  const key = queryKeys.userHighlights(translationCode ?? "none");

  return useMutation({
    mutationFn: (payload: CreateHighlightInput) => createUserHighlight(payload),
    onSuccess: (created) => {
      queryClient.setQueryData<UserHighlight[]>(key, (prev) => [
        created,
        ...(prev ?? []),
      ]);
      dispatchHighlightsUpdated({ source });
    },
  });
};

export const useDeleteHighlightMutation = (
  translationCode: string | null | undefined,
  source = "highlights-screen",
) => {
  const queryClient = useQueryClient();
  const key = queryKeys.userHighlights(translationCode ?? "none");

  return useMutation({
    mutationFn: (highlight: UserHighlight) =>
      deleteUserHighlight(highlight.id),
    onMutate: async (highlight) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserHighlight[]>(key);
      queryClient.setQueryData<UserHighlight[]>(key, (prev) =>
        (prev ?? []).filter((item) => item.id !== highlight.id),
      );
      return { previous };
    },
    onError: (_error, _highlight, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: () => {
      dispatchHighlightsUpdated({ source });
    },
  });
};

/** Delete then recreate with a new color (optimistic). */
export const useRecolorHighlightMutation = (
  translationCode: string | null | undefined,
  source = "highlights-screen",
) => {
  const queryClient = useQueryClient();
  const key = queryKeys.userHighlights(translationCode ?? "none");

  return useMutation({
    mutationFn: async ({
      highlight,
      color,
      translationId,
    }: {
      highlight: UserHighlight;
      color: string;
      translationId?: string | null;
    }) => {
      await deleteUserHighlight(highlight.id);
      return createUserHighlight({
        translationId:
          translationId ?? highlight.translationId ?? null,
        bookId: highlight.bookId,
        chapter: highlight.chapter,
        verseStart: highlight.verseStart,
        verseEnd: highlight.verseEnd,
        color,
      });
    },
    onMutate: async ({ highlight, color }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserHighlight[]>(key);
      queryClient.setQueryData<UserHighlight[]>(key, (prev) =>
        (prev ?? []).map((item) =>
          item.id === highlight.id ? { ...item, color } : item,
        ),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: (created, { highlight }) => {
      queryClient.setQueryData<UserHighlight[]>(key, (prev) => {
        const withoutOld = (prev ?? []).filter(
          (item) => item.id !== highlight.id,
        );
        return [created, ...withoutOld];
      });
      dispatchHighlightsUpdated({ source });
    },
  });
};
