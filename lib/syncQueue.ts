import type { SupabaseClient } from "@supabase/supabase-js";

import { getQueueStore } from "@/lib/offlineStore";
import { createClient } from "@/lib/supabase/client";

export type SyncOperation = "insert" | "update" | "delete" | "upsert";

export interface SyncQueuePayload {
  table: string;
  op: SyncOperation;
  payload: Record<string, unknown>;
  match?: Record<string, unknown>;
}

export interface SyncQueueItem extends SyncQueuePayload {
  id: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
  lastTriedAt?: string;
}

export interface FlushQueueOptions {
  client?: SupabaseClient;
}

// lib/syncQueue.ts
export type QueuedOperation = "insert" | "update" | "delete" | "upsert";

/**
 * Represents a single queued mutation (for offline actions).
 * Each QueuedAction is persisted to IndexedDB and replayed
 * when the app returns online.
 */
export interface QueuedAction<T = any> {
  id: string;

  table: string;

  op: QueuedOperation;

  match?: Record<string, any>;

  payload: T;

  createdAt?: number;
}

const queueKey = (id: string) => `sword_queue_${id}`;

const nowIso = () => new Date().toISOString();

const getQueueStoreOrNull = () => {
  const store = getQueueStore();
  if (!store) {
    console.warn("[offline-sync] Queue store unavailable (likely SSR context)");
    return null;
  }
  return store;
};

/**
 * List queued sync actions in FIFO order.
 */
export const listQueuedActions = async (): Promise<SyncQueueItem[]> => {
  const store = getQueueStoreOrNull();
  if (!store) return [];

  const items: SyncQueueItem[] = [];

  await store.iterate<SyncQueueItem, void>((value: any, key: any) => {
    if (key.startsWith("sword_queue_") && value) {
      items.push(value);
    }
  });

  return items.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
};

/**
 * Queue a mutation for later sync. Returns the queued item or null when offline storage is unavailable.
 */
export const enqueueAction = async (
  action: SyncQueuePayload & { id?: string }
): Promise<SyncQueueItem | null> => {
  const store = getQueueStoreOrNull();
  if (!store) return null;

  const id = action.id ?? crypto.randomUUID();
  const existing = await store.getItem<SyncQueueItem>(queueKey(id));
  if (existing) {
    return existing;
  }

  const item: SyncQueueItem = {
    id,
    table: action.table,
    op: action.op,
    payload: action.payload,
    match: action.match,
    queuedAt: nowIso(),
    attempts: 0,
  };

  await store.setItem(queueKey(item.id), item);
  console.info(
    `[offline-sync] Enqueued ${item.op} for ${item.table} (${item.id})`
  );
  return item;
};

const runSupabaseAction = async (
  client: SupabaseClient,
  item: SyncQueueItem
) => {
  switch (item.op) {
    case "insert": {
      const { error } = await client.from(item.table).insert(item.payload);
      if (error) throw error;
      break;
    }
    case "update": {
      const { error } = await client
        .from(item.table)
        .update(item.payload)
        .match(item.match ?? item.payload);
      if (error) throw error;
      break;
    }
    case "delete": {
      const { error } = await client
        .from(item.table)
        .delete()
        .match(item.match ?? item.payload);
      if (error) throw error;
      break;
    }
    default:
      throw new Error(`Unsupported sync operation: ${item.op}`);
  }
};

/**
 * Attempt to deliver all pending actions when the app is online.
 */
export const flushQueueWhenOnline = async (
  options: FlushQueueOptions = {}
): Promise<{ flushed: number; remaining: number }> => {
  if (typeof window !== "undefined" && !navigator.onLine) {
    console.info("[offline-sync] Skipping flush: offline");
    return { flushed: 0, remaining: (await listQueuedActions()).length };
  }

  const store = getQueueStoreOrNull();
  if (!store) return { flushed: 0, remaining: 0 };

  const client = options.client ?? createClient();
  const pending = await listQueuedActions();
  if (pending.length === 0) {
    return { flushed: 0, remaining: 0 };
  }

  let flushed = 0;

  for (const item of pending) {
    try {
      await runSupabaseAction(client, item);
      await store.removeItem(queueKey(item.id));
      flushed += 1;
      console.info(
        `[offline-sync] Flushed ${item.op} on ${item.table} (${item.id})`
      );
    } catch (error) {
      const lastError = error instanceof Error ? error.message : String(error);
      const updated: SyncQueueItem = {
        ...item,
        attempts: item.attempts + 1,
        lastError,
        lastTriedAt: nowIso(),
      };
      await store.setItem(queueKey(updated.id), updated);
      console.warn(
        `[offline-sync] Failed to flush ${item.table} (${item.id}): ${lastError}`
      );
    }
  }

  const remaining = await listQueuedActions();

  return { flushed, remaining: remaining.length };
};

/**
 * Remove every queued action from offline storage.
 */
export const clearQueue = async (): Promise<void> => {
  const store = getQueueStoreOrNull();
  if (!store) return;

  await store.iterate((_value: any, key: any) => {
    if (key.startsWith("sword_queue_")) {
      void store.removeItem(key);
    }
  });

  console.info("[offline-sync] Cleared pending queue");
};
