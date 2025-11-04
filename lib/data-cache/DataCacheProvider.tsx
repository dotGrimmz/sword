"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type PropsWithChildren,
} from "react";
import { useSyncExternalStore } from "react";

type QueryStatus = "idle" | "loading" | "success" | "error";

type CacheEntry = {
  data?: unknown;
  error?: unknown;
  promise: Promise<unknown> | null;
  updatedAt?: number;
  staleTime: number;
  listeners: Set<() => void>;
  snapshot?: QuerySnapshot<unknown>;
};

export type QuerySnapshot<T> = {
  status: QueryStatus;
  data?: T;
  error?: unknown;
  updatedAt?: number;
  stale: boolean;
};

type FetchOptions = {
  staleTime?: number;
};

type SetOptions<T> = T | ((previous?: T) => T);

interface DataCacheValue {
  getSnapshot<T>(key: string): QuerySnapshot<T>;
  subscribe(key: string, listener: () => void): () => void;
  fetch<T>(key: string, fetcher: () => Promise<T>, options?: FetchOptions): Promise<T>;
  setData<T>(key: string, value: SetOptions<T>): void;
  setError(key: string, error: unknown): void;
  invalidate(key: string): void;
}

const DataCacheContext = createContext<DataCacheValue | null>(null);

const now = () => Date.now();

const getEntry = (store: MutableRefObject<Map<string, CacheEntry>>, key: string) => {
  const existing = store.current.get(key);
  if (existing) {
    return existing;
  }
  const entry: CacheEntry = {
    promise: null,
    listeners: new Set(),
    staleTime: 0,
  };
  store.current.set(key, entry);
  return entry;
};

const resolveSnapshot = <T,>(entry: CacheEntry): QuerySnapshot<T> => {
  const stale =
    entry.updatedAt === undefined ||
    (entry.staleTime > 0 && entry.updatedAt !== undefined && now() - entry.updatedAt > entry.staleTime);

  let status: QueryStatus;
  let data: T | undefined;
  let error: unknown;

  if (entry.data !== undefined) {
    status = entry.promise ? "loading" : "success";
    data = entry.data as T;
  } else if (entry.error !== undefined) {
    status = "error";
    error = entry.error;
  } else if (entry.promise) {
    status = "loading";
  } else {
    status = "idle";
  }

  const nextSnapshot: QuerySnapshot<T> = {
    status,
    data,
    error,
    updatedAt: entry.updatedAt,
    stale,
  };

  const previous = entry.snapshot as QuerySnapshot<T> | undefined;

  if (
    previous &&
    previous.status === nextSnapshot.status &&
    previous.data === nextSnapshot.data &&
    previous.error === nextSnapshot.error &&
    previous.updatedAt === nextSnapshot.updatedAt &&
    previous.stale === nextSnapshot.stale
  ) {
    return previous;
  }

  entry.snapshot = nextSnapshot as QuerySnapshot<unknown>;
  return nextSnapshot;
};

const notify = (entry: CacheEntry) => {
  entry.listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("[DataCache] listener error", error);
    }
  });
};

export const DataCacheProvider = ({ children }: PropsWithChildren) => {
  const storeRef = useRef<Map<string, CacheEntry>>(new Map());

  const value = useMemo<DataCacheValue>(() => {
    return {
      getSnapshot<T>(key: string) {
        const entry = getEntry(storeRef, key);
        return resolveSnapshot<T>(entry);
      },
      subscribe(key, listener) {
        const entry = getEntry(storeRef, key);
        entry.listeners.add(listener);
        return () => {
          entry.listeners.delete(listener);
        };
      },
      async fetch<T>(key: string, fetcher: () => Promise<T>, options?: FetchOptions) {
        const entry = getEntry(storeRef, key);
        const staleTime = options?.staleTime ?? entry.staleTime ?? 0;
        entry.staleTime = staleTime;

        if (entry.promise) {
          return entry.promise as Promise<T>;
        }

        if (
          entry.data !== undefined &&
          (!entry.updatedAt ||
            staleTime === 0 ||
            (entry.updatedAt && now() - entry.updatedAt <= staleTime))
        ) {
          return Promise.resolve(entry.data as T);
        }

        const promise = fetcher()
          .then((result) => {
            entry.data = result;
            entry.error = undefined;
            entry.updatedAt = now();
            entry.promise = null;
            notify(entry);
            return result;
          })
          .catch((error) => {
            entry.error = error;
            entry.promise = null;
            entry.updatedAt = now();
            notify(entry);
            throw error;
          });

        entry.promise = promise;
        notify(entry);
        return promise;
      },
      setData<T>(key: string, value: SetOptions<T>) {
        const entry = getEntry(storeRef, key);
        const current = entry.data as T | undefined;
        entry.data = typeof value === "function" ? (value as (prev?: T) => T)(current) : value;
        entry.error = undefined;
        entry.updatedAt = now();
        notify(entry);
      },
      setError(key, error) {
        const entry = getEntry(storeRef, key);
        entry.error = error;
        entry.promise = null;
        entry.updatedAt = now();
        notify(entry);
      },
      invalidate(key) {
        const entry = getEntry(storeRef, key);
        entry.updatedAt = undefined;
        notify(entry);
      },
    };
  }, []);

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>;
};

export const useDataCacheContext = () => {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error("useDataCacheContext must be used within a DataCacheProvider");
  }
  return context;
};

type UseDataQueryOptions<T> = FetchOptions & {
  enabled?: boolean;
  initialData?: T;
};

export const useDataQuery = <T,>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseDataQueryOptions<T>,
) => {
  const cache = useDataCacheContext();

  const staleTime = options?.staleTime ?? 0;
  const enabled = options?.enabled ?? true;
  const initialData = options?.initialData;

  const fetchOptions = useMemo<FetchOptions>(
    () => ({
      staleTime,
    }),
    [staleTime],
  );

  const getSnapshot = useMemo(() => {
    return () => cache.getSnapshot<T>(key);
  }, [cache, key]);
  const subscribe = useMemo(() => {
    return (listener: () => void) => cache.subscribe(key, listener);
  }, [cache, key]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (initialData === undefined) return;
    if (snapshot.status !== "idle") return;
    cache.setData(key, initialData);
  }, [cache, initialData, key, snapshot.status]);

  useEffect(() => {
    if (!enabled) return;
    if (snapshot.status === "idle" || snapshot.stale) {
      void cache.fetch<T>(key, fetcher, fetchOptions);
    }
  }, [cache, enabled, fetchOptions, fetcher, key, snapshot.stale, snapshot.status]);

  const refetch = () => cache.fetch<T>(key, fetcher, fetchOptions);

  return {
    data: snapshot.data,
    error: snapshot.error,
    status: snapshot.status,
    isLoading: !enabled ? false : snapshot.status === "idle" || snapshot.status === "loading",
    isFetching: snapshot.status === "loading",
    isError: snapshot.status === "error",
    stale: snapshot.stale,
    refetch,
    setData: (value: SetOptions<T>) => cache.setData<T>(key, value),
    invalidate: () => cache.invalidate(key),
  };
};
