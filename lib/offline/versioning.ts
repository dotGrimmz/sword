import {
  clearAllCaches,
  deletePack,
  getCacheVersion,
  loadPack,
  setCacheVersion,
} from "@/lib/offlineStore";

export interface PackManifest {
  version: string;
  packs: Record<string, Record<string, string>>;
}

export interface VersionCheckResult {
  manifestVersion: string | null;
  cacheVersionChanged: boolean;
  needsDownload: Array<{
    namespace: string;
    id: string;
    expectedVersion: string;
  }>;
}

const PACK_MANIFEST_URL = "/packs/manifest.json";

/**
 * Fetch the published pack manifest from the public directory.
 */
export const fetchPackManifest = async (): Promise<PackManifest | null> => {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch(PACK_MANIFEST_URL, { cache: "no-store" });
    if (!response.ok) {
      console.warn("[offline] Unable to load pack manifest", response.status);
      return null;
    }
    return (await response.json()) as PackManifest;
  } catch (error) {
    console.warn("[offline] Failed to fetch pack manifest", error);
    return null;
  }
};

/**
 * Compare the manifest with cached versions. Clears caches on major version
 * changes and deletes outdated packs so that the next online fetch can refresh them.
 */
export const reconcilePackManifest = async (
  manifest: PackManifest,
): Promise<VersionCheckResult> => {
  const currentVersion = await getCacheVersion();
  let cacheVersionChanged = false;

  if (!currentVersion || currentVersion !== manifest.version) {
    await clearAllCaches();
    await setCacheVersion(manifest.version);
    cacheVersionChanged = true;
  }

  const needsDownload: VersionCheckResult["needsDownload"] = [];

  for (const [namespace, packs] of Object.entries(manifest.packs ?? {})) {
    for (const [id, expectedVersion] of Object.entries(packs)) {
      const cached = await loadPack(namespace, id);
      if (!cached) {
        needsDownload.push({ namespace, id, expectedVersion });
        continue;
      }

      if (cached.version !== expectedVersion) {
        await deletePack(namespace, id);
        needsDownload.push({ namespace, id, expectedVersion });
      }
    }
  }

  return {
    manifestVersion: manifest.version ?? null,
    cacheVersionChanged,
    needsDownload,
  };
};
