"use client";

import { useMemo, useState } from "react";
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

  const percentages = useMemo(() => {
    if (snapshot.totalVotes === 0) {
      return Array.from({ length: options.length }, () => 0);
    }
    return snapshot.totals.map((count) =>
      Math.round((count / snapshot.totalVotes) * 100),
    );
  }, [snapshot, options.length]);

  const handleVote = async (optionIndex: number) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
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
      toast.success("Thanks for voting!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unexpected error submitting vote.",
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
          {snapshot.totalVotes} vote{snapshot.totalVotes === 1 ? "" : "s"}
        </p>
      </header>

      <div className={styles.options}>
        {options.map((option, index) => {
          const isSelected = snapshot.userVote === index;
          return (
            <div key={option} className={styles.option}>
              <div className={styles.optionHeader}>
                <p>{option}</p>
                <span>{percentages[index]}%</span>
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
