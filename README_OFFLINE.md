# Offline Caching Overview

The SWORD offline subsystem provides shared utilities for caching JSON packs, tracking pending mutations while offline, and keeping the client cache in sync with published pack metadata. This foundation enables modules such as Bible, Apologetics, and Notes to work with the same infrastructure.

## useOfflineStore hook

```tsx
const { packs, savePack, loadPack, deletePack, refresh } = useOfflineStore<MyPack>("bible");
```

- `savePack(id, data, version)` persists a pack as `{ namespace, id, data, version, updatedAt }` under `sword_<namespace>_<id>`.
- `loadPack(id)` returns the most recent cached pack or `null`.
- `deletePack(id)` removes the pack.
- `packs` stays in sync across components thanks to a lightweight subscription system.
- `refresh()` re-queries the namespace and updates local state.

Only call the hook in client components. It safely no-ops during SSR.

## Sync queue

Mutations performed while offline are queued through helpers in `lib/syncQueue.ts`.

- `enqueueAction({ table, op, payload, match })` stores `insert`, `update`, or `delete` intents with a generated UUID.
- `flushQueueWhenOnline()` replays pending items when connectivity returns, using the browser Supabase client. Failures are re-enqueued with incremented attempt counters and logged.
- `listQueuedActions()` and `clearQueue()` support diagnostics and manual resets.

The queue shares the same IndexedDB database (`sword_offline`) but lives in the `queue` store, using keys `sword_queue_<uuid>`.

## Cache versioning

- Pack metadata lives in `public/packs/manifest.json`.
- On startup (when online), `OfflineProvider` fetches the manifest, compares `manifest.version` with the stored `sword_cache_version`, and clears all caches if it changes.
- Packs whose stored version differs from the manifest are deleted so the client can re-download fresh data.

Use `setCacheVersion()` to bump the global version when shipping breaking pack updates. Call `clearAllCaches()` to wipe everything locally.

## Key conventions

- Packs: `sword_<namespace>_<id>` (e.g., `sword_bible_default`).
- Queue items: `sword_queue_<uuid>`.
- Meta: `sword_cache_version`.

All utilities are Promise-based and compatible with JSON serialisable data structures.

## Invalidating caches

1. Publish a new `/public/packs/manifest.json` with the incremented `version` (for a global reset) or updated per-pack semantic versions.
2. Optionally call `clearNamespace(namespace)` to drop a single namespace from IndexedDB.
3. Users will automatically reconcile on the next online session via `OfflineProvider`.
