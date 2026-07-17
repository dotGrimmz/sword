"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { filterComboboxOptions } from "@/lib/bible/filterBooks";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/components/ui/utils";

import styles from "./Combobox.module.css";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Extra client-side match terms (aliases, abbreviations, etc.). */
  keywords?: string[];
};

export type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  id?: string;
  "aria-label"?: string;
};

/**
 * Reusable client-side typeahead + dropdown.
 * Filters options locally by label, value, and optional keywords.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  id,
  "aria-label": ariaLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = React.useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = React.useMemo(
    () => filterComboboxOptions(options, query),
    [options, query],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    const selectedIndex = options.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
    // Reset search UI whenever the popover opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    setActiveIndex((prev) => {
      if (filtered.length === 0) return 0;
      return Math.min(prev, filtered.length - 1);
    });
  }, [filtered.length]);

  React.useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(
      `[data-combobox-index="${activeIndex}"]`,
    );
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, filtered]);

  const selectValue = (next: string) => {
    onValueChange(next);
    setOpen(false);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % filtered.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (filtered.length === 0) return;
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) {
        selectValue(option.value);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={cn(styles.root, className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={id ? `${id}-listbox` : undefined}
            aria-label={ariaLabel}
            disabled={disabled}
            data-placeholder={!selected ? "" : undefined}
            className={cn(styles.trigger, triggerClassName)}
          >
            <span className={styles.triggerLabel}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className={cn(
            "w-[var(--radix-popover-trigger-width)] max-w-[min(100vw-1.5rem,28rem)] border-0 bg-transparent p-0 shadow-none",
            styles.content,
            contentClassName,
          )}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className={styles.searchRow}>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className={styles.searchInput}
              aria-autocomplete="list"
              aria-controls={id ? `${id}-listbox` : undefined}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <div
            ref={listRef}
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className={styles.list}
          >
            {filtered.length === 0 ? (
              <p className={styles.empty}>{emptyMessage}</p>
            ) : (
              filtered.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-combobox-index={index}
                    data-active={isActive ? "" : undefined}
                    data-selected={isSelected ? "" : undefined}
                    className={styles.option}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectValue(option.value)}
                  >
                    <span className={styles.optionLabel}>{option.label}</span>
                    {isSelected ? (
                      <CheckIcon className={styles.check} aria-hidden="true" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
