"use client";

import { ArrowUpRight, BookOpen, Download, ExternalLink, FileText, Link2 } from "lucide-react";

import { formatWeekLabel, startOfWeek } from "@/lib/study/week";

import {
  isDraftImage,
  visibleDraftMaterials,
  type DraftMaterial,
} from "./draft-materials";
import styles from "./StudyHubPreview.module.css";

export type StudyHubPreviewProps = {
  title: string;
  weekStart: string;
  book: string;
  chapter: string;
  versesRange: string;
  summary: string;
  memoryVerse: string;
  reflectionQuestions: string[];
  pollQuestion: string;
  pollOptions: string[];
  published: boolean;
  isCancelled: boolean;
  materials: DraftMaterial[];
};

const formatReference = (
  book: string,
  chapter: string,
  range: string,
) => {
  if (!book.trim() || !chapter.trim()) return "Scripture not set yet";
  return `${book} ${chapter}${range.trim() ? `:${range.trim()}` : ""}`;
};

export function StudyHubPreview({
  title,
  weekStart,
  book,
  chapter,
  versesRange,
  summary,
  memoryVerse,
  reflectionQuestions,
  pollQuestion,
  pollOptions,
  published,
  isCancelled,
  materials,
}: StudyHubPreviewProps) {
  const weekLabel = (() => {
    try {
      if (!weekStart) return "This week";
      return formatWeekLabel(startOfWeek(new Date(`${weekStart}T12:00:00`)));
    } catch {
      return "This week";
    }
  })();

  const reference = formatReference(book, chapter, versesRange);
  const topic = title.trim() || "Untitled study";
  const visibleMaterials = visibleDraftMaterials(materials);
  const questions = reflectionQuestions.map((q) => q.trim()).filter(Boolean);
  const options = pollOptions.map((o) => o.trim()).filter(Boolean);
  const showEmpty =
    !title.trim() && !book.trim() && !summary.trim() && visibleMaterials.length === 0;

  const statusLabel = isCancelled
    ? "Hidden"
    : published
      ? "Published look"
      : "Draft preview";

  return (
    <aside className={styles.wrap} aria-label="Member Study hub preview">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Member preview</p>
          <h3 className={styles.title}>What they will see</h3>
        </div>
        <span className={styles.status}>{statusLabel}</span>
      </div>

      <div className={styles.phone}>
        {showEmpty || isCancelled ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <BookOpen />
            </span>
            <p className={styles.emptyTitle}>
              {isCancelled
                ? "Hidden from members"
                : "No study posted this week"}
            </p>
            <p className={styles.emptyText}>
              {isCancelled
                ? "Members will not see this study while it is hidden."
                : "Fill in the topic and scripture to preview the hub."}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.topBar}>
              <span className={styles.back}>← Today</span>
              <span className={styles.brand}>SWORD</span>
            </div>

            <div className={styles.hero}>
              <p className={styles.heroEyebrow}>
                This Week&apos;s Study · {weekLabel}
              </p>
              <h4 className={styles.heroTitle}>{topic}</h4>
              <div className={styles.scriptureRow}>
                <p className={styles.scriptureRef}>{reference}</p>
                {book.trim() && chapter.trim() ? (
                  <span className={styles.heroLink}>
                    Open in Reader
                    <ArrowUpRight className={styles.heroLinkIcon} />
                  </span>
                ) : null}
              </div>
            </div>

            {summary.trim() ? (
              <section className={styles.card}>
                <p className={styles.cardEyebrow}>Summary</p>
                <p className={styles.summary}>{summary.trim()}</p>
              </section>
            ) : null}

            {visibleMaterials.length > 0 ? (
              <section className={styles.card}>
                <p className={styles.cardEyebrow}>Materials</p>
                <ul className={styles.materials}>
                  {visibleMaterials.map((material) => (
                    <MaterialRow key={material.localId} material={material} />
                  ))}
                </ul>
              </section>
            ) : null}

            {memoryVerse.trim() ? (
              <section className={styles.memory}>
                <p className={styles.cardEyebrow}>Memory Verse</p>
                <blockquote className={styles.quote}>
                  “{memoryVerse.trim()}”
                </blockquote>
                <p className={styles.memoryRef}>{reference}</p>
              </section>
            ) : null}

            {questions.length > 0 ? (
              <section className={styles.cardMuted}>
                <p className={styles.cardEyebrow}>Reflection</p>
                <ol className={styles.questions}>
                  {questions.map((question, index) => (
                    <li key={`${question}-${index}`}>{question}</li>
                  ))}
                </ol>
              </section>
            ) : null}

            {pollQuestion.trim() && options.length >= 2 ? (
              <section className={styles.cardMuted}>
                <p className={styles.cardEyebrow}>Poll</p>
                <p className={styles.pollQ}>{pollQuestion.trim()}</p>
                <ul className={styles.pollOptions}>
                  {options.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

function MaterialRow({ material }: { material: DraftMaterial }) {
  const image = isDraftImage(material);
  const Icon = material.kind === "file" ? FileText : Link2;
  const src = material.previewUrl || material.url;

  return (
    <li className={styles.materialCard}>
      <span className={styles.materialIcon}>
        {image && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className={styles.materialThumb} />
        ) : (
          <Icon aria-hidden="true" />
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
        <ExternalLink className={styles.materialAction} aria-hidden="true" />
      )}
    </li>
  );
}
