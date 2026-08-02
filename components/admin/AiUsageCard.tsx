"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/api/fetch";
import type { OpenAiMonthUsage } from "@/lib/ai/usage";

import styles from "./AiUsageCard.module.css";

const formatTokens = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

const formatUsd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);

const formatFetchedAt = (iso: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export default function AiUsageCard() {
  const [usage, setUsage] = useState<OpenAiMonthUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUsage = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);

    try {
      const data = await apiFetch<OpenAiMonthUsage>("/api/admin/ai-usage", {
        cache: "no-store",
      });
      setUsage(data);
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unable to load OpenAI usage";
      setError(message);
      if (mode === "initial") setUsage(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadUsage("initial");
  }, [loadUsage]);

  const credit = usage?.creditBalanceUsd ?? null;
  const spent = usage?.spentUsd ?? 0;
  const remaining = usage?.remainingUsd ?? null;
  const pctUsed =
    credit != null && credit > 0
      ? Math.min(100, Math.round((spent / credit) * 1000) / 10)
      : null;
  const nearLimit = pctUsed != null && pctUsed >= 80;

  return (
    <section className={styles.card} aria-label="OpenAI credit balance">
      <div className={styles.topRow}>
        <p className={styles.eyebrow}>OpenAI · Credit balance</p>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void loadUsage("refresh")}
          disabled={loading || refreshing}
          aria-label="Refresh credit usage"
        >
          <RefreshCw
            className={
              refreshing
                ? `${styles.refreshIcon} ${styles.spin}`
                : styles.refreshIcon
            }
            aria-hidden="true"
          />
          {refreshing ? "Updating…" : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p className={styles.meta}>Fetching live billing usage…</p>
      ) : error ? (
        <>
          <p className={styles.error}>{error}</p>
          <p className={styles.meta}>
            Check OPENAI_ADMIN_KEY, then hit Refresh.
          </p>
        </>
      ) : !usage || credit == null || remaining == null || pctUsed == null ? (
        <p className={styles.meta}>No usage data.</p>
      ) : (
        <>
          <div className={styles.headerRow}>
            <p className={styles.title}>
              Spent vs {formatUsd(credit)} credit
            </p>
            <p
              className={
                nearLimit
                  ? `${styles.pctLabel} ${styles.pctLabelWarn}`
                  : styles.pctLabel
              }
            >
              {pctUsed}% used
            </p>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Spent</p>
              <p
                className={
                  nearLimit
                    ? `${styles.statValue} ${styles.statValueWarn}`
                    : styles.statValue
                }
              >
                {formatUsd(spent)}
              </p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Credit</p>
              <p className={`${styles.statValue} ${styles.statValueMuted}`}>
                {formatUsd(credit)}
              </p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Remaining</p>
              <p className={styles.statValue}>{formatUsd(remaining)}</p>
            </div>
          </div>

          <div
            className={styles.meter}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={credit}
            aria-valuenow={spent}
            aria-label="Credit spent of prepaid balance"
          >
            <div
              className={
                nearLimit
                  ? `${styles.meterFill} ${styles.meterFillWarn}`
                  : styles.meterFill
              }
              style={{ width: `${Math.min(100, pctUsed)}%` }}
            />
          </div>

          <p className={styles.meta}>
            This month · {formatTokens(usage.totalTokens)} tokens (
            {formatTokens(usage.inputTokens)} in /{" "}
            {formatTokens(usage.outputTokens)} out) ·{" "}
            {formatTokens(usage.requestCount)} requests · updated{" "}
            {formatFetchedAt(usage.fetchedAt)}
          </p>
        </>
      )}
    </section>
  );
}
