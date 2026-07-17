"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteUserBookmark,
  getUserBookmarks,
  upsertUserBookmark,
  type UpsertBookmarkInput,
} from "@/lib/api/bookmarks";
import { dispatchBookmarksUpdated } from "@/lib/events";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import type { UserBookmark } from "@/types/user";

export const useBookmarksQuery = (
  translationCode: string | null | undefined,
) => {
  const translationKey = translationCode ?? "none";
  return useQuery({
    queryKey: queryKeys.userBookmarks(translationKey),
    queryFn: () => getUserBookmarks(translationCode ?? undefined),
    staleTime: STALE_TIMES.user,
    enabled: Boolean(translationCode),
  });
};

export const useUpsertBookmarkMutation = (
  translationCode: string | null | undefined,
  source = "reader",
) => {
  const queryClient = useQueryClient();
  const key = queryKeys.userBookmarks(translationCode ?? "none");

  return useMutation({
    mutationFn: (payload: UpsertBookmarkInput) => upsertUserBookmark(payload),
    onSuccess: (bookmark) => {
      queryClient.setQueryData<UserBookmark[]>(key, (prev) => {
        const others = (prev ?? []).filter(
          (item) =>
            item.bookId !== bookmark.bookId || item.chapter !== bookmark.chapter,
        );
        return [bookmark, ...others];
      });
      dispatchBookmarksUpdated({ source });
    },
  });
};

export const useDeleteBookmarkMutation = (
  translationCode: string | null | undefined,
  source = "reader",
) => {
  const queryClient = useQueryClient();
  const key = queryKeys.userBookmarks(translationCode ?? "none");

  return useMutation({
    mutationFn: (bookmark: UserBookmark) => deleteUserBookmark(bookmark.id),
    onMutate: async (bookmark) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserBookmark[]>(key);
      queryClient.setQueryData<UserBookmark[]>(key, (prev) =>
        (prev ?? []).filter((item) => item.id !== bookmark.id),
      );
      return { previous };
    },
    onError: (_error, _bookmark, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSuccess: () => {
      dispatchBookmarksUpdated({ source });
    },
  });
};
