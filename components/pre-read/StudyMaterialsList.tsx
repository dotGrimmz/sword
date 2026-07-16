"use client";

import { Download, ExternalLink, FileText, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { listStudyMaterials } from "@/lib/api/study";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

import styles from "@/app/pre-read/PreReadPage.module.css";

type StudyMaterialsListProps = {
  studyId: string;
  className?: string;
};

export function StudyMaterialsList({
  studyId,
  className,
}: StudyMaterialsListProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.studyMaterials(studyId),
    queryFn: () => listStudyMaterials(studyId),
    staleTime: STALE_TIMES.profile,
  });

  const materials = data ?? [];

  if (isLoading) {
    return (
      <section className={className}>
        <p className={styles.sectionEyebrow}>Materials</p>
        <p className={styles.summaryText}>Loading materials…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className={className}>
        <p className={styles.sectionEyebrow}>Materials</p>
        <p className={styles.summaryText}>Unable to load materials right now.</p>
      </section>
    );
  }

  if (materials.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <p className={styles.sectionEyebrow}>Materials</p>
      <ul className={styles.materialsList}>
        {materials.map((material) => {
          const image = Boolean(material.mime_type?.startsWith("image/"));
          const Icon = material.kind === "file" ? FileText : Link2;
          return (
            <li key={material.id}>
              <a
                href={material.url}
                target="_blank"
                rel="noreferrer"
                className={styles.materialCard}
                download={material.kind === "file" && !image ? true : undefined}
              >
                <span className={styles.materialIconWrap}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={material.url}
                      alt=""
                      className={styles.materialThumb}
                    />
                  ) : (
                    <Icon className={styles.materialIcon} aria-hidden="true" />
                  )}
                </span>
                <span className={styles.materialBody}>
                  <span className={styles.materialTitle}>{material.title}</span>
                  <span className={styles.materialMeta}>
                    {image
                      ? "View image"
                      : material.kind === "file"
                        ? "Download file"
                        : "Open link"}
                  </span>
                </span>
                {material.kind === "file" && !image ? (
                  <Download className={styles.materialAction} aria-hidden="true" />
                ) : (
                  <ExternalLink
                    className={styles.materialAction}
                    aria-hidden="true"
                  />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
