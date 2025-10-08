"use client";

import { useCallback, useEffect, useState } from "react";

import { useOfflineContext } from "@/components/OfflineProvider";
import {
  enqueueAction,
  flushQueueWhenOnline,
  QueuedAction,
} from "@/lib/syncQueue";
import type { UserHighlight } from "@/types/user";

import { getUserHighlights } from "@/lib/api/highlights";

import { useOfflineStore } from "@/lib/hooks/useOfflineStore";

const HIGHLIGHTS_NAMESPACE = "highlights";
const HIGHLIGHTS_PACK_ID = "list";

/**
 * Provides an offline-first data management layer for user highlights.
 *
 * It fetches highlights from the server when online and saves them to an offline pack.
 * When offline, it loads highlights from the local pack. All mutations are queued
 * when offline and flushed to the server upon reconnection.
 */
export const useOfflineHighlights = () => {
  const { isOnline, isReady: isOfflineReady } = useOfflineContext();
  const {
    packs: highlightPacks,
    savePack,
    refresh,
  } = useOfflineStore<UserHighlight[]>(HIGHLIGHTS_NAMESPACE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const highlights =
    highlightPacks.find((p) => p.id === HIGHLIGHTS_PACK_ID)?.data ?? [];

  // Initial data fetch and hydration
  useEffect(() => {
    if (!isOfflineReady) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (isOnline) {
          const serverHighlights = await getUserHighlights();
          // This should be replaced with the manifest version.
          await savePack(HIGHLIGHTS_PACK_ID, serverHighlights, "1.0.0");
        } else {
          // Ensure local data is loaded if we start offline
          await refresh();
        }
      } catch (e) {
        console.warn(
          "[offline-highlights] Failed to fetch, loading from cache.",
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

  const deleteHighlight = useCallback(
    async (id: string) => {
      const optimisticHighlights = highlights.filter((h: any) => h.id !== id);
      // The version should come from the manifest
      await savePack(HIGHLIGHTS_PACK_ID, optimisticHighlights, "1.0.0");

      const action: QueuedAction = {
        id,
        table: "highlights",
        op: "delete",
        match: { id },
        payload: {}, // Not needed for delete
      };

      await enqueueAction(action);
      if (isOnline) {
        await flushQueueWhenOnline();
      }
    },
    [highlights, savePack, isOnline]
  );

  // `createHighlight` and `updateHighlight` would follow a similar pattern,
  // handling optimistic updates and queueing actions.
  const createHighlight = useCallback(
    async (newHighlight: UserHighlight) => {
      // 1️⃣ Optimistically update local cache
      const optimisticHighlights = [...highlights, newHighlight];
      await savePack(HIGHLIGHTS_PACK_ID, optimisticHighlights, "1.0.0");

      // 2️⃣ Queue the create action
      const action: QueuedAction = {
        id: newHighlight.id,
        table: "highlights",
        op: "insert",
        payload: newHighlight,
      };

      await enqueueAction(action);

      // 3️⃣ If online, flush immediately
      if (isOnline) {
        await flushQueueWhenOnline();
      }
    },
    [highlights, savePack, isOnline]
  );

  const updateHighlight = useCallback(
    async (id: string, updates: Partial<UserHighlight>) => {
      // 1️⃣ Optimistic local update
      const optimisticHighlights = highlights.map((h: any) =>
        h.id === id ? { ...h, ...updates } : h
      );
      await savePack(HIGHLIGHTS_PACK_ID, optimisticHighlights, "1.0.0");

      // 2️⃣ Queue the update action
      const action: QueuedAction = {
        id,
        table: "highlights",
        op: "update",
        match: { id },
        payload: updates,
      };

      await enqueueAction(action);

      // 3️⃣ Flush if online
      if (isOnline) {
        await flushQueueWhenOnline();
      }
    },
    [highlights, savePack, isOnline]
  );

  return {
    highlights,
    isLoading,
    error,
    deleteHighlight,
    updateHighlight,
    createHighlight,
  };
};
