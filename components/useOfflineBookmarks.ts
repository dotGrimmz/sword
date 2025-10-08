"use client";

import { useCallback, useEffect, useState } from "react";

import { useOfflineContext } from "@/components/OfflineProvider";
import {
  enqueueAction,
  flushQueueWhenOnline,
  type QueuedAction,
} from "@/lib/syncQueue";
// import {
//   type UserBookmark,
//   type UpsertUserBookmarkPayload,
//   getUserBookmarks,
// } from "@lib/api/bookmarks";
import { useOfflineStore } from "@/lib/hooks/useOfflineStore";
import { UpsertUserBookmarkPayload, UserBookmark } from "@/types/user";
import { getUserBookmarks } from "@/lib/api/bookmarks";

const BOOKMARKS_NAMESPACE = "bookmarks";
const BOOKMARKS_PACK_ID = "list";

/**
 * Provides an offline-first data management layer for user bookmarks.
 *
 * It fetches bookmarks from the server when online and saves them to an offline pack.
 * When offline, it loads bookmarks from the local pack. All mutations are queued
 * when offline and flushed to the server upon reconnection.
 */
export const useOfflineBookmarks = () => {
  const { isOnline, isReady: isOfflineReady } = useOfflineContext();
  const {
    packs: bookmarkPacks,
    savePack,
    refresh,
  } = useOfflineStore<UserBookmark[]>(BOOKMARKS_NAMESPACE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const bookmarks =
    bookmarkPacks.find((p) => p.id === BOOKMARKS_PACK_ID)?.data ?? [];

  // Initial data fetch and hydration
  useEffect(() => {
    if (!isOfflineReady) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isOnline) {
          const serverBookmarks = await getUserBookmarks();
          // This should be replaced with the manifest version.
          await savePack(BOOKMARKS_PACK_ID, serverBookmarks, "1.0.0");
        } else {
          // Ensure local data is loaded if we start offline
          await refresh();
        }
      } catch (e) {
        console.warn(
          "[offline-bookmarks] Failed to fetch, loading from cache.",
          e
        );
        await refresh();
        if (e instanceof Error) setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [isOnline, isOfflineReady, savePack, refresh]);

  const upsertBookmark = useCallback(
    async (payload: UpsertUserBookmarkPayload) => {
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      //@ts-ignore
      const optimisticBookmark: UserBookmark = {
        ...payload,
        id: tempId,
        user_id: "", // Will be set by the server
        createdAt: now,
        updatedAt: now,
      };

      // Since there's one bookmark per chapter, remove any existing one for that chapter.
      const optimisticBookmarks = [
        optimisticBookmark,
        ...bookmarks.filter(
          //@ts-ignore

          (b) => !(b.bookId === payload.bookId && b.chapter === payload.chapter)
        ),
      ];
      await savePack(BOOKMARKS_PACK_ID, optimisticBookmarks, "1.0.0");

      const action: QueuedAction = {
        id: tempId,
        table: "bookmarks",
        op: "upsert",
        payload,
      };

      await enqueueAction(action);
      if (isOnline) {
        await flushQueueWhenOnline();
      }
    },
    [bookmarks, savePack, isOnline]
  );

  const deleteBookmark = useCallback(
    async (id: string) => {
      // Implementation would follow the same pattern as other hooks
    },
    [bookmarks, savePack, isOnline]
  );

  return {
    bookmarks,
    isLoading,
    error,
    upsertBookmark,
    deleteBookmark,
  };
};
