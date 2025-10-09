import localforage from "localforage";

/**
 * Shared IndexedDB-backed offline cache for feature packs across the SWORD app.
 * Keys follow the convention: sword_<namespace>_<id>
 */
export const OFFLINE_DB_NAME = "sword_offline";
const PACK_STORE_NAME = "packs" as const;
const META_STORE_NAME = "meta" as const;
const QUEUE_STORE_NAME = "queue" as const;

export type OfflineStorageNamespace = string;

export interface OfflinePack<T = unknown> {
  namespace: OfflineStorageNamespace;
  id: string;
  data: T;
  version: string;
  updatedAt: string;
}

export const CACHE_VERSION_KEY = "sword_cache_version";

const storeRegistry: Partial<
  Record<
    typeof PACK_STORE_NAME | typeof META_STORE_NAME | typeof QUEUE_STORE_NAME,
    LocalForage
  >
> = {};

const namespaceListeners = new Map<OfflineStorageNamespace, Set<() => void>>();

const isBrowser = () => typeof window !== "undefined";

function getStore(
  storeName:
    | typeof PACK_STORE_NAME
    | typeof META_STORE_NAME
    | typeof QUEUE_STORE_NAME
) {
  if (!isBrowser()) {
    return null;
  }

  if (!storeRegistry[storeName]) {
    storeRegistry[storeName] = localforage.createInstance({
      name: OFFLINE_DB_NAME,
      storeName,
      description: "SWORD offline cache",
    });
  }

  return storeRegistry[storeName]!;
}

type NamespaceListener = () => void;

const notifyNamespace = (namespace: OfflineStorageNamespace) => {
  const listeners = namespaceListeners.get(namespace);
  if (!listeners) return;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("[offline] listener failed", error);
    }
  });
};

/**
 * Subscribe to changes within a namespace. Returns an unsubscribe handler.
 */
export const subscribeToNamespace = (
  namespace: OfflineStorageNamespace,
  listener: NamespaceListener
) => {
  const listeners =
    namespaceListeners.get(namespace) ?? new Set<NamespaceListener>();
  listeners.add(listener);
  namespaceListeners.set(namespace, listeners);

  return () => {
    const next = namespaceListeners.get(namespace);
    if (!next) return;
    next.delete(listener);
    if (next.size === 0) {
      namespaceListeners.delete(namespace);
    }
  };
};

const prefixFor = (namespace: OfflineStorageNamespace) => `sword_${namespace}_`;

const keyFor = (namespace: OfflineStorageNamespace, id: string) =>
  `${prefixFor(namespace)}${id}`;

const getPackStore = () => getStore(PACK_STORE_NAME);

const getMetaStore = () => getStore(META_STORE_NAME);

/**
 * Low-level accessor for the queue store used by the sync subsystem.
 */
export const getQueueStore = () => getStore(QUEUE_STORE_NAME);

/**
 * Test whether browser APIs required for offline storage are available.
 */
export const isOfflineStorageSupported = () =>
  isBrowser() && typeof indexedDB !== "undefined";

/**
 * Persist a JSON pack under the given namespace.
 */
export const savePack = async <T>(
  namespace: OfflineStorageNamespace,
  id: string,
  data: T,
  version: string
): Promise<OfflinePack<T> | null> => {
  const store = getPackStore();
  if (!store) return null;

  const pack: OfflinePack<T> = {
    namespace,
    id,
    data,
    version,
    updatedAt: new Date().toISOString(),
  };

  await store.setItem(keyFor(namespace, id), pack);
  notifyNamespace(namespace);
  console.info(`[offline] Saved pack ${namespace}/${id} v${version}`);
  return pack;
};

/**
 * Load a JSON pack by namespace and id.
 */
export const loadPack = async <T>(
  namespace: OfflineStorageNamespace,
  id: string
): Promise<OfflinePack<T> | null> => {
  const store = getPackStore();
  if (!store) return null;

  const stored = await store.getItem<OfflinePack<T>>(keyFor(namespace, id));
  return stored ?? null;
};

/**
 * Remove a specific pack from the offline cache.
 */
export const deletePack = async (
  namespace: OfflineStorageNamespace,
  id: string
): Promise<void> => {
  const store = getPackStore();
  if (!store) return;

  await store.removeItem(keyFor(namespace, id));
  notifyNamespace(namespace);
  console.info(`[offline] Deleted pack ${namespace}/${id}`);
};

/**
 * Retrieve all packs for the provided namespace.
 */
export const getAllPacks = async <T>(
  namespace: OfflineStorageNamespace
): Promise<Array<OfflinePack<T>>> => {
  const store = getPackStore();
  if (!store) return [];

  const prefix = prefixFor(namespace);
  const packs: Array<OfflinePack<T>> = [];

  await store.iterate<OfflinePack<T>, void>((value, key) => {
    if (key.startsWith(prefix) && value) {
      packs.push(value);
    }
  });

  return packs;
};

/**
 * Drop every pack stored under the namespace.
 */
export const clearNamespace = async (
  namespace: OfflineStorageNamespace
): Promise<void> => {
  const store = getPackStore();
  if (!store) return;

  const keysToRemove: string[] = [];
  const prefix = prefixFor(namespace);

  await store.iterate((_value, key) => {
    if (key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  });

  await Promise.all(keysToRemove.map((key) => store.removeItem(key)));
  notifyNamespace(namespace);
  console.info(`[offline] Cleared namespace ${namespace}`);
};

/**
 * Read the currently stored global cache version marker.
 */
export const getCacheVersion = async (): Promise<string | null> => {
  const store = getMetaStore();
  if (!store) return null;

  return (await store.getItem<string>(CACHE_VERSION_KEY)) ?? null;
};

/**
 * Persist a global cache version marker.
 */
export const setCacheVersion = async (version: string): Promise<void> => {
  const store = getMetaStore();
  if (!store) return;

  await store.setItem(CACHE_VERSION_KEY, version);
  console.info(`[offline] Cache version set to ${version}`);
};

/**
 * Force-remove all packs and metadata.
 */
export const clearAllCaches = async (): Promise<void> => {
  const packStore = getPackStore();
  const metaStore = getMetaStore();
  if (packStore) {
    await packStore.clear();
  }
  if (metaStore) {
    await metaStore.clear();
  }
  namespaceListeners.clear();
  console.info("[offline] Cleared all offline caches");
};
