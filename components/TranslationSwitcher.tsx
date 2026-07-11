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
  showCodeOnly?: boolean;
  size?: "default" | "compact";
};

export const TranslationSwitcher = memo(function TranslationSwitcher({
  className,
  selectClassName,
  label = "Translation",
  hideLabel = false,
  showCodeOnly = false,
  size = "default",
}: TranslationSwitcherProps) {
  const {
    translations,
    translationCode,
    isLoadingTranslations,
    selectTranslation,
  } = useTranslationContext();

  const isDisabled = translations.length === 0 || !selectTranslation;

  const placeholder = isLoadingTranslations
    ? "Loading translations…"
    : translations.length === 0
    ? "No translations"
    : "Select translation";

  const selectValue = translationCode ?? "__none__";
  const selectedTranslation = translations.find(
    (item) => item.code === translationCode,
  );
  const compactTriggerLabel =
    showCodeOnly && selectedTranslation
      ? selectedTranslation.code.toUpperCase()
      : null;

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
        value={selectValue}
        onValueChange={(value) => selectTranslation(value === "__none__" ? "" : value)}
        disabled={isDisabled}
      >
        <SelectTrigger
          className={cn(styles.selectTrigger, selectClassName)}
          aria-label="Choose Bible translation"
        >
          {compactTriggerLabel ? (
            <span className={styles.selectValue}>{compactTriggerLabel}</span>
          ) : (
            <SelectValue placeholder={placeholder} className={styles.selectValue} />
          )}
        </SelectTrigger>
        <SelectContent className={styles.selectContent} sideOffset={6}>
          <SelectItem value="__none__" disabled className={styles.selectItem}>
            Select translation
          </SelectItem>
          {translations.map((item) => (
            <SelectItem key={item.code} value={item.code} className={styles.selectItem}>
              {`${item.code.toUpperCase()} · ${item.name}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});
