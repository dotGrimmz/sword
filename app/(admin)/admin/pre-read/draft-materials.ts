export type DraftMaterial = {
  localId: string;
  kind: "link" | "file";
  title: string;
  /** Absolute URL for links, or public URL once persisted. */
  url?: string;
  /** Local file awaiting upload on save. */
  file?: File;
  /** Object URL or public URL for image preview. */
  previewUrl?: string;
  mimeType?: string | null;
  /** Existing DB id when editing. */
  persistedId?: string;
  markedForDelete?: boolean;
};

export const createLocalId = () =>
  `local_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;

export const visibleDraftMaterials = (materials: DraftMaterial[]) =>
  materials.filter((material) => !material.markedForDelete);

export const isDraftImage = (material: DraftMaterial) => {
  if (material.mimeType?.startsWith("image/")) return true;
  if (material.file?.type.startsWith("image/")) return true;
  if (material.previewUrl && material.kind === "file") {
    return /\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(material.previewUrl);
  }
  return false;
};
