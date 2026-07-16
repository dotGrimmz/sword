import type { SupabaseClient } from "@supabase/supabase-js";

import type { LinkMaterialInput, StudyMaterial } from "@/types/study";

export const STUDY_MATERIALS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_STUDY_BUCKET ?? "study-materials";

export function normalizeStudyMaterial(row: Record<string, unknown>): StudyMaterial {
  return {
    id: String(row.id),
    pre_read_id: String(row.pre_read_id),
    title: String(row.title),
    kind: row.kind === "file" ? "file" : "link",
    url: String(row.url),
    storage_path: (row.storage_path as string | null) ?? null,
    mime_type: (row.mime_type as string | null) ?? null,
    byte_size: typeof row.byte_size === "number" ? row.byte_size : null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

export async function createLinkMaterial(
  supabase: SupabaseClient,
  input: LinkMaterialInput,
): Promise<StudyMaterial> {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title) {
    throw new Error("Material title is required");
  }
  if (!url) {
    throw new Error("Material URL is required");
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Material URL must be http or https");
    }
  } catch {
    throw new Error("Invalid material URL");
  }

  const { data, error } = await supabase
    .from("study_materials")
    .insert({
      pre_read_id: input.preReadId,
      title,
      kind: "link",
      url,
      storage_path: null,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeStudyMaterial(data as Record<string, unknown>);
}

export async function createFileMaterial(
  supabase: SupabaseClient,
  input: {
    preReadId: string;
    title: string;
    file: File;
    sortOrder?: number;
  },
  bucket = STUDY_MATERIALS_BUCKET,
): Promise<StudyMaterial> {
  const title = input.title.trim() || input.file.name;
  const extension = input.file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${input.preReadId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  const { data, error } = await supabase
    .from("study_materials")
    .insert({
      pre_read_id: input.preReadId,
      title,
      kind: "file",
      url: publicUrl,
      storage_path: path,
      mime_type: input.file.type || null,
      byte_size: input.file.size,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(error.message);
  }

  return normalizeStudyMaterial(data as Record<string, unknown>);
}

export async function deleteMaterial(
  supabase: SupabaseClient,
  material: StudyMaterial,
  bucket = STUDY_MATERIALS_BUCKET,
): Promise<void> {
  if (material.kind === "file" && material.storage_path) {
    await supabase.storage.from(bucket).remove([material.storage_path]);
  }

  const { error } = await supabase
    .from("study_materials")
    .delete()
    .eq("id", material.id);

  if (error) {
    throw new Error(error.message);
  }
}
