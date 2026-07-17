import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

export const EVENT_COVERS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_EVENT_COVERS_BUCKET ?? "event-covers";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);

const PUBLIC_PREFIX = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/${EVENT_COVERS_BUCKET}/`
  : null;

export const isSupportedCoverType = (mime: string) =>
  ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime);

const extensionFor = (file: File) => {
  const parts = (file.name ?? "").split(".");
  const ext = parts.length > 1 ? parts.pop() : null;
  if (ext) return ext.toLowerCase();
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
};

export function extractEventCoverPath(publicUrl: string | null | undefined) {
  if (!publicUrl || !PUBLIC_PREFIX) return null;
  if (!publicUrl.startsWith(PUBLIC_PREFIX)) return null;
  const path = publicUrl.slice(PUBLIC_PREFIX.length);
  return path.length > 0 ? path : null;
}

export async function uploadEventCover(
  client: SupabaseClient,
  file: File,
  ownerId: string,
  previousUrl?: string | null,
): Promise<string> {
  if (!isSupportedCoverType(file.type)) {
    throw new Error("Cover must be PNG, JPEG, WebP, or GIF");
  }
  if (file.size > MAX_COVER_BYTES) {
    throw new Error("Cover must be 5 MB or less");
  }

  const path = `${ownerId}/${randomUUID()}.${extensionFor(file)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await client.storage
    .from(EVENT_COVERS_BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl },
  } = client.storage.from(EVENT_COVERS_BUCKET).getPublicUrl(path);

  const previousPath = extractEventCoverPath(previousUrl);
  if (previousPath) {
    await client.storage.from(EVENT_COVERS_BUCKET).remove([previousPath]);
  }

  return publicUrl;
}

export async function removeEventCover(
  client: SupabaseClient,
  publicUrl: string | null | undefined,
): Promise<void> {
  const path = extractEventCoverPath(publicUrl);
  if (!path) return;
  await client.storage.from(EVENT_COVERS_BUCKET).remove([path]);
}
