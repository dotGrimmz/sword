"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import localforage from "localforage";

import { OFFLINE_DB_NAME, isOfflineStorageSupported } from "@/lib/offlineStore";
import { fetchPackManifest, reconcilePackManifest } from "@/lib/offline/versioning";
import { flushQueueWhenOnline } from "@/lib/syncQueue";

interface OfflineContextValue {
  isOnline: boolean;
  isReady: boolean;
  isSupported: boolean;
  flushQueue: typeof flushQueueWhenOnline;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

/**
 * Provides connectivity status and flushes the offline sync queue whenever the
 * app transitions back online.
 */
export const OfflineProvider = ({ children }: PropsWithChildren) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const flushQueue = useCallback(() => flushQueueWhenOnline(), []);
  const reconcileManifest = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;

    const manifest = await fetchPackManifest();
    if (!manifest) return;

    const result = await reconcilePackManifest(manifest);
    if (result.cacheVersionChanged) {
      console.info(
        `[offline] Cache version updated to ${result.manifestVersion ?? "unknown"}`,
      );
    }
    if (result.needsDownload.length > 0) {
      console.info(
        "[offline] Packs pending download:",
        result.needsDownload.map((entry) => `${entry.namespace}/${entry.id}@${entry.expectedVersion}`),
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported = isOfflineStorageSupported();
    setIsSupported(supported);

    if (!supported) {
      console.warn("[offline] Offline storage not supported in this environment");
      setIsReady(true);
      return;
    }

    localforage.config({
      name: OFFLINE_DB_NAME,
      storeName: "packs",
      description: "SWORD offline cache",
    });

    const applyStatus = () => setIsOnline(navigator.onLine);
    applyStatus();

    const handleOnline = () => {
      setIsOnline(true);
      void flushQueue();
      void reconcileManifest();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const initialise = async () => {
      await flushQueue();
      await reconcileManifest();
      setIsReady(true);
    };

    void initialise();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueue, reconcileManifest]);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      isReady,
      isSupported,
      flushQueue,
    }),
    [flushQueue, isOnline, isReady, isSupported],
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

/**
 * Access the offline provider state, ensuring the hook is used within the provider tree.
 */
export const useOfflineContext = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOfflineContext must be used inside OfflineProvider");
  }
  return context;
};
