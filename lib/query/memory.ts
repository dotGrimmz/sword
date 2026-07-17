"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createUserMemoryVerse,
  deleteUserMemoryVerse,
  getUserMemoryVerses,
  reviewUserMemoryVerse,
  type CreateMemoryVerseInput,
  type ReviewMemoryVerseInput,
} from "@/lib/api/memory";
import { dispatchMemoryUpdated } from "@/lib/events";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import type { UserMemoryVerse } from "@/types/user";

export const useMemoryVersesQuery = (
  translationCode: string | null | undefined,
) => {
  const translationKey = translationCode ?? "none";
  return useQuery({
    queryKey: queryKeys.userMemory(translationKey),
    queryFn: () => getUserMemoryVerses(translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: Boolean(translationCode),
  });
};

export const useCreateMemoryVerseMutation = (
  translationCode: string | null | undefined,
  source = "memory-screen",
) => {
  const queryClient = useQueryClient();
  const translationKey = translationCode ?? "none";
  const key = queryKeys.userMemory(translationKey);

  return useMutation({
    mutationFn: (payload: CreateMemoryVerseInput) =>
      createUserMemoryVerse(payload),
    onSuccess: (created) => {
      queryClient.setQueryData<UserMemoryVerse[]>(key, (prev) => [
        created,
        ...(prev ?? []),
      ]);
      dispatchMemoryUpdated({ source });
    },
  });
};

export const useDeleteMemoryVerseMutation = (
  translationCode: string | null | undefined,
  source = "memory-screen",
) => {
  const queryClient = useQueryClient();
  const translationKey = translationCode ?? "none";
  const key = queryKeys.userMemory(translationKey);

  return useMutation({
    mutationFn: (verse: UserMemoryVerse) => deleteUserMemoryVerse(verse.id),
    onMutate: async (verse) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserMemoryVerse[]>(key);
      queryClient.setQueryData<UserMemoryVerse[]>(key, (prev) =>
        (prev ?? []).filter((item) => item.id !== verse.id),
      );
      return { previous };
    },
    onError: (_error, _verse, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: () => {
      dispatchMemoryUpdated({ source });
    },
  });
};

export const useReviewMemoryVerseMutation = (
  translationCode: string | null | undefined,
  source = "memory-screen",
) => {
  const queryClient = useQueryClient();
  const translationKey = translationCode ?? "none";
  const key = queryKeys.userMemory(translationKey);

  return useMutation({
    mutationFn: (payload: ReviewMemoryVerseInput) =>
      reviewUserMemoryVerse(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<UserMemoryVerse[]>(key, (prev) =>
        (prev ?? []).map((item) => (item.id === updated.id ? updated : item)),
      );
      dispatchMemoryUpdated({ source });
    },
  });
};
