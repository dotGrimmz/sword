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
          <SelectValue placeholder={placeholder} className={styles.selectValue}>
            {isLoadingTranslations && <span className={styles.loadingDot} />}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {translations.map((translation) => (
            <SelectItem key={translation.code} value={translation.code}>
              {translation.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
