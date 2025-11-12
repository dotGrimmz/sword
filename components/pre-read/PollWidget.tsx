"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { PollSnapshot } from "@/lib/pre-read/poll";

import styles from "./PollWidget.module.css";

type PollWidgetProps = {
  preReadId: string;
  question: string;
  options: string[];
  initialSnapshot: PollSnapshot | null;
  className?: string;
};

const buildInitialSnapshot = (
  snapshot: PollSnapshot | null,
  optionCount: number,
): PollSnapshot => {
  if (snapshot) return snapshot;
  return {
    totals: Array.from({ length: optionCount }, () => 0),
    totalVotes: 0,
    userVote: null,
  };
};

export function PollWidget({
  preReadId,
  question,
  options,
  initialSnapshot,
  className,
}: PollWidgetProps) {
  const [snapshot, setSnapshot] = useState(() =>
    buildInitialSnapshot(initialSnapshot, options.length),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const snapshotTotals = snapshot.totals;

  useEffect(() => {
    setSnapshot(buildInitialSnapshot(initialSnapshot, options.length));
  }, [initialSnapshot, options.length]);

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`/api/pre-reads/${preReadId}/poll-responses`);
      if (!response.ok) {
        throw new Error("Unable to refresh poll.");
      }
      const data = (await response.json()) as PollSnapshot;
      setSnapshot(data);
    } catch (error) {
      console.error("Failed to refresh poll snapshot", error);
    }
  }, [preReadId]);

  const totals = useMemo(
    () => options.map((_, index) => snapshotTotals[index] ?? 0),
    [options, snapshotTotals],
  );

  const totalVotes = useMemo(
    () => totals.reduce((sum, count) => sum + count, 0),
    [totals],
  );

  const percentages = useMemo(() => {
    if (totalVotes === 0) {
      return totals.map(() => 0);
    }
    return totals.map((count) => Math.round((count / totalVotes) * 100));
  }, [totals, totalVotes]);

  const handleVote = async (optionIndex: number) => {
    if (isSubmitting) return;

    if (snapshot.userVote === optionIndex) {
      return;
    }

    const isChange = snapshot.userVote !== null;
    if (isChange && !window.confirm("Change your vote to this option?")) {
      return;
    }

    const pendingToast = toast.loading(
      isChange ? "Updating your vote..." : "Submitting your vote...",
    );

    setIsSubmitting(true);
    try {
      const previousVote = snapshot.userVote;
      const response = await fetch(
        `/api/pre-reads/${preReadId}/poll-responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ optionIndex }),
        },
      );

      if (!response.ok) {
        let message = "Unable to submit vote.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // ignore parsing error
        }
        throw new Error(message);
      }

      const data = (await response.json()) as PollSnapshot;
      setSnapshot(data);
      toast.success(previousVote === null ? "Vote submitted!" : "Vote updated.", {
        id: pendingToast,
      });
      void refreshSnapshot();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unexpected error submitting vote.",
        { id: pendingToast },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasVoted = snapshot.userVote !== null;

  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Poll</p>
        <h3 className={styles.question}>{question}</h3>
        <p className={styles.meta}>
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </p>
      </header>

      <div className={styles.options}>
        {options.map((option, index) => {
          const isSelected = snapshot.userVote === index;
          const optionVotes = totals[index] ?? 0;
          return (
            <div key={option} className={styles.option}>
              <div className={styles.optionHeader}>
                <p>{option}</p>
                <span>
                  {percentages[index]}% · {optionVotes} vote
                  {optionVotes === 1 ? "" : "s"}
                </span>
              </div>
              <div className={styles.progress}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${percentages[index]}%`,
                    background: isSelected
                      ? "var(--primary)"
                      : "color-mix(in oklab, var(--primary) 20%, transparent)",
                  }}
                />
              </div>
              <Button
                type="button"
                variant={isSelected ? "default" : "secondary"}
                size="sm"
                disabled={isSubmitting}
                onClick={() => handleVote(index)}
              >
                {isSelected
                  ? "Your choice"
                  : hasVoted
                    ? "Change vote"
                    : "Vote"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
