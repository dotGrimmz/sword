"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import {
  getAdminQuizUserAttempts,
  resetAdminQuizScores,
  resetAdminQuizUserAttempts,
} from "@/lib/api/admin-quizzes";
import { ApiError } from "@/lib/api/fetch";
import type {
  AdminQuizAttemptRow,
  AdminQuizScoreRow,
  AdminQuizScoresSummary,
} from "@/types/quizzes";

import pageStyles from "../AdminPage.module.css";
import styles from "./QuizScoresPanel.module.css";

type QuizScoresPanelProps = {
  quizId: string;
  scores: AdminQuizScoreRow[];
  summary: AdminQuizScoresSummary;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function QuizScoresPanel({
  quizId,
  scores,
  summary,
}: QuizScoresPanelProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attemptsByUser, setAttemptsByUser] = useState<
    Record<string, AdminQuizAttemptRow[]>
  >({});
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [errorByUser, setErrorByUser] = useState<Record<string, string>>({});
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState(false);

  const loadAttempts = useCallback(
    async (userId: string, force = false) => {
      if (!force && attemptsByUser[userId]) return;

      setLoadingUserId(userId);
      setErrorByUser((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      try {
        const { attempts } = await getAdminQuizUserAttempts(quizId, userId);
        setAttemptsByUser((prev) => ({ ...prev, [userId]: attempts }));
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Failed to load attempts";
        setErrorByUser((prev) => ({ ...prev, [userId]: message }));
      } finally {
        setLoadingUserId(null);
      }
    },
    [attemptsByUser, quizId],
  );

  const toggleRow = (userId: string) => {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);
    void loadAttempts(userId);
  };

  const handleResetUser = async (row: AdminQuizScoreRow) => {
    const confirmed = window.confirm(
      `Reset attempts for ${row.displayName}?\n\nThis deletes their ${row.attemptCount} attempt${row.attemptCount === 1 ? "" : "s"} and score for this quiz. They can take it again from scratch.`,
    );
    if (!confirmed) return;

    setResettingUserId(row.userId);
    try {
      await resetAdminQuizUserAttempts(quizId, row.userId);
      toast.success(`Reset attempts for ${row.displayName}`);
      setAttemptsByUser((prev) => {
        const next = { ...prev };
        delete next[row.userId];
        return next;
      });
      if (expandedId === row.userId) setExpandedId(null);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to reset member attempts";
      toast.error(message);
    } finally {
      setResettingUserId(null);
    }
  };

  const handleResetAll = async () => {
    if (scores.length === 0) return;
    const confirmed = window.confirm(
      `Reset ALL scores for this quiz?\n\nThis deletes attempts and scores for ${summary.memberCount} member${summary.memberCount === 1 ? "" : "s"}. This cannot be undone.`,
    );
    if (!confirmed) return;

    setResettingAll(true);
    try {
      const result = await resetAdminQuizScores(quizId);
      toast.success(
        `Reset ${result.deletedScores} score${result.deletedScores === 1 ? "" : "s"} (${result.deletedAttempts} attempt${result.deletedAttempts === 1 ? "" : "s"})`,
      );
      setAttemptsByUser({});
      setExpandedId(null);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to reset quiz scores";
      toast.error(message);
    } finally {
      setResettingAll(false);
    }
  };

  const busy = resettingAll || resettingUserId !== null;

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <p className={styles.toolbarCopy}>
          Unpublishing hides the quiz but keeps scores. Reset clears attempt
          limits so members can start over.
        </p>
        {scores.length > 0 ? (
          <button
            type="button"
            className={styles.resetAllButton}
            disabled={busy}
            onClick={() => void handleResetAll()}
          >
            {resettingAll ? "Resetting…" : "Reset all attempts"}
          </button>
        ) : null}
      </div>

      <div className={pageStyles.statsRow}>
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>Members</p>
          <p className={pageStyles.statValue}>{summary.memberCount}</p>
          <p className={pageStyles.statMeta}>Submitted at least once</p>
        </div>
        <div className={pageStyles.statCard}>
          <p className={pageStyles.statLabel}>Avg best %</p>
          <p className={pageStyles.statValue}>
            {summary.averageBestPercent == null
              ? "—"
              : `${summary.averageBestPercent}%`}
          </p>
          <p className={pageStyles.statMeta}>
            {summary.finalizedCount} locked / finalized
          </p>
        </div>
      </div>

      {scores.length === 0 ? (
        <p className={styles.empty}>
          No one has submitted this quiz yet. Scores will show up here after
          members take it.
        </p>
      ) : (
        <section className={styles.list} aria-label="Member scores">
          {scores.map((row) => {
            const expanded = expandedId === row.userId;
            const attempts = attemptsByUser[row.userId];
            const loading = loadingUserId === row.userId;
            const error = errorByUser[row.userId];
            const resetting = resettingUserId === row.userId;

            return (
              <article key={row.userId} className={styles.row}>
                <button
                  type="button"
                  className={styles.rowHeader}
                  onClick={() => toggleRow(row.userId)}
                  aria-expanded={expanded}
                >
                  <div className={styles.identity}>
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.avatarUrl}
                        alt=""
                        className={styles.avatar}
                      />
                    ) : (
                      <span className={styles.avatarFallback} aria-hidden="true">
                        {initials(row.displayName)}
                      </span>
                    )}
                    <div className={styles.copy}>
                      <p className={styles.name}>{row.displayName}</p>
                      <p className={styles.meta}>
                        {row.title?.trim() || row.email || row.role}
                      </p>
                      <p className={styles.meta}>
                        First: {formatDate(row.firstCompletedAt)} · Best:{" "}
                        {formatDate(row.bestAchievedAt)}
                      </p>
                    </div>
                  </div>

                  <div className={styles.scoreAside}>
                    <p className={styles.scoreValue}>
                      {row.bestScore}/{row.maxScore}
                    </p>
                    <p className={styles.scoreMeta}>
                      {Math.round(row.bestPercent)}% · {row.attemptCount}/
                      {row.maxAttempts} attempts
                    </p>
                    <div className={styles.badges}>
                      {row.finalized ? (
                        <span className={`${styles.badge} ${styles.badgeLocked}`}>
                          Locked
                        </span>
                      ) : null}
                    </div>
                    <p className={styles.expandHint}>
                      {expanded ? (
                        <>
                          Hide attempts <ChevronUp size={14} aria-hidden="true" />
                        </>
                      ) : (
                        <>
                          View attempts{" "}
                          <ChevronDown size={14} aria-hidden="true" />
                        </>
                      )}
                    </p>
                  </div>
                </button>

                {expanded ? (
                  <div className={styles.detail}>
                    <div className={styles.detailActions}>
                      <button
                        type="button"
                        className={styles.resetUserButton}
                        disabled={busy}
                        onClick={() => void handleResetUser(row)}
                      >
                        {resetting
                          ? "Resetting…"
                          : "Reset this member’s attempts"}
                      </button>
                    </div>
                    {loading ? (
                      <p className={styles.detailLoading}>Loading attempts…</p>
                    ) : null}
                    {error ? (
                      <p className={styles.detailError}>{error}</p>
                    ) : null}
                    {!loading && !error && attempts?.length === 0 ? (
                      <p className={styles.detailLoading}>
                        No attempts found for this member.
                      </p>
                    ) : null}
                    {!loading &&
                      attempts?.map((attempt) => (
                        <div key={attempt.attemptId} className={styles.attempt}>
                          <div className={styles.attemptHeader}>
                            <p className={styles.attemptScore}>
                              {attempt.score}/{attempt.maxScore}
                              {attempt.isBest ? (
                                <span
                                  className={`${styles.badge} ${styles.badgeBest}`}
                                  style={{ marginLeft: "0.5rem" }}
                                >
                                  Best
                                </span>
                              ) : null}
                            </p>
                            <p className={styles.attemptDate}>
                              {attempt.completedAt
                                ? formatDate(attempt.completedAt)
                                : "—"}
                            </p>
                          </div>
                          <ul className={styles.answerList}>
                            {attempt.answers.map((answer) => (
                              <li
                                key={`${attempt.attemptId}-${answer.questionId}`}
                                className={`${styles.answerItem} ${
                                  answer.correct
                                    ? styles.answerItemCorrect
                                    : styles.answerItemIncorrect
                                }`}
                              >
                                <p
                                  className={`${styles.answerBadge} ${
                                    answer.correct
                                      ? styles.answerBadgeCorrect
                                      : styles.answerBadgeIncorrect
                                  }`}
                                >
                                  {answer.correct ? "Correct" : "Incorrect"}
                                </p>
                                <p className={styles.answerPrompt}>
                                  {answer.prompt}
                                </p>
                                <p className={styles.answerLine}>
                                  Answer: {answer.value || "—"}
                                </p>
                                {!answer.correct && answer.correctAnswer ? (
                                  <p className={styles.answerLine}>
                                    Correct: {answer.correctAnswer}
                                  </p>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
