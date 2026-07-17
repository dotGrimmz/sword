"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import type { PollSnapshot } from "@/lib/pre-read/poll";

import styles from "./PollWidget.module.css";

type AdminPollResultsProps = {
  preReadId: string;
  question: string;
  options: string[];
  className?: string;
};

export function AdminPollResults({
  preReadId,
  question,
  options,
  className,
}: AdminPollResultsProps) {
  const [snapshot, setSnapshot] = useState<PollSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/pre-reads/${preReadId}/poll-responses`,
      );
      if (!response.ok) {
        throw new Error("Unable to load poll results.");
      }
      const data = (await response.json()) as PollSnapshot;
      setSnapshot(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load poll results.",
      );
    } finally {
      setLoading(false);
    }
  }, [preReadId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () => options.map((_, index) => snapshot?.totals[index] ?? 0),
    [options, snapshot],
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

  if (!question.trim() || options.length < 2) {
    return null;
  }

  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Poll results</p>
        <h3 className={styles.question}>{question}</h3>
        <p className={styles.meta}>
          {loading
            ? "Loading votes…"
            : `${totalVotes} vote${totalVotes === 1 ? "" : "s"}`}
        </p>
      </header>

      {loading ? (
        <div className={styles.options}>
          <Loader2 className="h-5 w-5 animate-spin text-[#d91f26]" aria-hidden="true" />
        </div>
      ) : error ? (
        <p className={styles.meta}>{error}</p>
      ) : (
        <div className={styles.options}>
          {options.map((option, index) => {
            const optionVotes = totals[index] ?? 0;
            return (
              <div key={`${option}-${index}`} className={styles.option}>
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
                    style={{ width: `${percentages[index]}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
