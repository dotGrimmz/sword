"use client";

import { ExternalLink, FileUp, Link2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createLocalId,
  isDraftImage,
  visibleDraftMaterials,
  type DraftMaterial,
} from "./draft-materials";
import styles from "./PreReadForm.module.css";

const btnIconSize = "size-12 md:size-9";
const btnSecondary =
  "h-14 min-h-14 min-w-[8.5rem] px-6 text-base md:h-11 md:min-h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-[#e0c4b6] bg-white text-[#1a1a1a] hover:border-[#d91f26] hover:bg-[#d91f26]/10 hover:text-[#d91f26]";
const btnPrimary =
  "h-14 min-h-14 min-w-[8.5rem] px-6 text-base md:h-11 md:min-h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-0 bg-gradient-to-br from-[#d91f26] to-[#f28c00] text-white font-bold shadow-[0_10px_24px_color-mix(in_oklab,#d91f26_28%,transparent)] hover:brightness-105 hover:text-white";
const uploadBtn =
  "relative inline-flex h-14 min-h-14 min-w-[8.5rem] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md bg-gradient-to-br from-[#d91f26] to-[#f28c00] px-6 text-base font-bold text-white hover:brightness-105 md:h-11 md:min-h-11 md:min-w-[7.5rem] md:px-6 md:text-sm";

type StudyMaterialsEditorProps = {
  materials: DraftMaterial[];
  onChange: (next: DraftMaterial[]) => void;
};

export function StudyMaterialsEditor({
  materials,
  onChange,
}: StudyMaterialsEditorProps) {
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const visible = visibleDraftMaterials(materials);

  const handleAddLink = () => {
    if (!linkTitle.trim() || !linkUrl.trim()) {
      toast.error("Title and URL are required.");
      return;
    }
    try {
      const parsed = new URL(linkUrl.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid");
      }
    } catch {
      toast.error("Enter a valid http(s) link.");
      return;
    }

    onChange([
      ...materials,
      {
        localId: createLocalId(),
        kind: "link",
        title: linkTitle.trim(),
        url: linkUrl.trim(),
      },
    ]);
    setLinkTitle("");
    setLinkUrl("");
    setShowLinkForm(false);
    toast.success("Link added — it will save with the study.");
  };

  const handleUpload = (file: File | null) => {
    if (!file) return;

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined;

    onChange([
      ...materials,
      {
        localId: createLocalId(),
        kind: "file",
        title: file.name,
        file,
        previewUrl,
        mimeType: file.type || null,
      },
    ]);
    toast.success("File attached — it will upload when you save.");
  };

  const handleRemove = (localId: string) => {
    onChange(
      materials.flatMap((material) => {
        if (material.localId !== localId) return [material];
        if (material.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(material.previewUrl);
        }
        if (material.persistedId) {
          return [{ ...material, markedForDelete: true }];
        }
        return [];
      }),
    );
  };

  return (
    <section className={styles.materialsPanel}>
      <div className={styles.materialsHeader}>
        <div>
          <p className={styles.materialsEyebrow}>4 · Materials</p>
          <h3 className={styles.materialsTitle}>Study materials</h3>
          <p className={styles.helper}>
            Attach links and files now. They stay with this form until you save
            the study.
          </p>
        </div>
        <div className={styles.materialsActions}>
          <Button
            type="button"
            variant="outline"
            className={btnSecondary}
            onClick={() => setShowLinkForm((open) => !open)}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            Add link
          </Button>
          <label className={uploadBtn}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
            <span>Upload file</span>
            <input
              type="file"
              className={styles.uploadInput}
              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                handleUpload(file);
              }}
            />
          </label>
        </div>
      </div>

      <label
        className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleUpload(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <FileUp className={styles.dropzoneIcon} aria-hidden="true" />
        <span className={styles.dropzoneTitle}>Drop a PDF or image here</span>
        <span className={styles.dropzoneMeta}>or click to choose a file</span>
        <input
          type="file"
          className={styles.uploadInput}
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            handleUpload(file);
          }}
        />
      </label>

      {showLinkForm ? (
        <div className={styles.linkForm}>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <Label className={styles.label}>Link title</Label>
              <Input
                className={`${styles.control} w-full min-w-0 max-w-full`}
                value={linkTitle}
                onChange={(event) => setLinkTitle(event.target.value)}
                placeholder="Discussion guide"
              />
            </div>
            <div className={styles.field}>
              <Label className={styles.label}>Link URL</Label>
              <Input
                className={`${styles.control} w-full min-w-0 max-w-full`}
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <Button
            type="button"
            className={`w-fit ${btnPrimary}`}
            onClick={handleAddLink}
          >
            Attach link
          </Button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className={styles.helper}>No materials yet — add a link or upload.</p>
      ) : (
        <ul className={styles.materialsList}>
          {visible.map((material) => {
            const href = material.url ?? material.previewUrl ?? "#";
            const image = isDraftImage(material);
            return (
              <li key={material.localId} className={styles.materialRow}>
                {image && (material.previewUrl || material.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={material.previewUrl || material.url}
                    alt=""
                    className={styles.materialThumb}
                  />
                ) : (
                  <span className={styles.materialKind}>{material.kind}</span>
                )}
                <div className={styles.materialInfo}>
                  {material.url ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.materialLink}
                    >
                      {material.title}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className={styles.materialLink}>{material.title}</span>
                  )}
                  {!material.persistedId ? (
                    <span className={styles.helper}>Pending save</span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={btnIconSize}
                  onClick={() => handleRemove(material.localId)}
                  aria-label={`Remove ${material.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
