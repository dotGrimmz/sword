"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deletePack,
  getAllPacks as getAllPacksFromStore,
  type OfflinePack,
  type OfflineStorageNamespace,
  loadPack,
  savePack,
  subscribeToNamespace,
} from "@/lib/offlineStore";

export interface UseOfflineStoreResult<T> {
  packs: Array<OfflinePack<T>>;
  savePack: (id: string, data: T, version: string) => Promise<OfflinePack<T> | null>;
  loadPack: (id: string) => Promise<OfflinePack<T> | null>;
  deletePack: (id: string) => Promise<void>;
  refresh: () => Promise<Array<OfflinePack<T>>>;
}

/**
 * React hook that exposes the offline storage API for a namespace and
 * re-renders whenever packs within that namespace change.
 */
export const useOfflineStore = <T>(
  namespace: OfflineStorageNamespace,
): UseOfflineStoreResult<T> => {
  const [packs, setPacks] = useState<Array<OfflinePack<T>>>([]);
  const latestNamespace = useRef(namespace);

  useEffect(() => {
    latestNamespace.current = namespace;
  }, [namespace]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const existing = await getAllPacksFromStore<T>(namespace);
      if (!cancelled) {
        setPacks(existing);
      }
    };

    bootstrap();

    const unsubscribe = subscribeToNamespace(namespace, async () => {
      const currentNamespace = latestNamespace.current;
      const next = await getAllPacksFromStore<T>(currentNamespace);
      setPacks(next);
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [namespace]);

  const handleSave = useCallback(
    async (id: string, data: T, version: string) =>
      savePack<T>(latestNamespace.current, id, data, version),
    [],
  );

  const handleLoad = useCallback(
    async (id: string) => loadPack<T>(latestNamespace.current, id),
    [],
  );

  const handleDelete = useCallback(
    async (id: string) => deletePack(latestNamespace.current, id),
    [],
  );

  const refresh = useCallback(async () => {
    const currentNamespace = latestNamespace.current;
    const next = await getAllPacksFromStore<T>(currentNamespace);
    setPacks(next);
    return next;
  }, []);

  return {
    packs,
    savePack: handleSave,
    loadPack: handleLoad,
    deletePack: handleDelete,
    refresh,
  };
};
