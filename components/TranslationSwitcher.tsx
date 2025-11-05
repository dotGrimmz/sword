"use client";

import { memo } from "react";

import { useTranslationContext } from "./TranslationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "./ui/utils";
import styles from "./TranslationSwitcher.module.css";

type TranslationSwitcherProps = {
  className?: string;
  selectClassName?: string;
  label?: string;
  hideLabel?: boolean;
  size?: "default" | "compact";
};

export const TranslationSwitcher = memo(function TranslationSwitcher({
  className,
  selectClassName,
  label = "Translation",
  hideLabel = false,
  size = "default",
}: TranslationSwitcherProps) {
  const {
    translations,
    translationCode,
    translation,
    isLoadingTranslations,
    selectTranslation,
  } = useTranslationContext();

  const isDisabled =
    isLoadingTranslations || translations.length === 0 || !selectTranslation;

  const placeholder = isLoadingTranslations
    ? "Loading…"
    : translations.length === 0
    ? "No translations"
    : "Select translation";

  const active = translation ?? translations.find((item) => item.code === translationCode) ?? null;

  return (
    <div
      className={cn(
        styles.container,
        size === "compact" && styles.compact,
        className
      )}
    >
      {!hideLabel ? <span className={styles.label}>{label}</span> : null}
      <Select
        value={translationCode ?? undefined}
        onValueChange={(value) => selectTranslation(value)}
        disabled={isDisabled}
      >
        <SelectTrigger
          className={cn(styles.selectTrigger, selectClassName)}
          aria-label="Choose Bible translation"
        >
          <SelectValue
            placeholder={placeholder}
            className={styles.selectValue}
          >
            {isLoadingTranslations ? (
              <span className={styles.loadingDot} />
            ) : active ? (
              <span className={styles.activeValue}>
                <span className={styles.activeCode}>
                  {active.code.toUpperCase()}
                </span>
                <span className={styles.activeName}>{active.name}</span>
              </span>
            ) : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {translations.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              <span className={styles.optionRow}>
                <span className={styles.optionName}>{item.name}</span>
                <span className={styles.optionCode}>{item.code.toUpperCase()}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
