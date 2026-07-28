"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  buildMonthWeeks,
  formatWeekRangeDetailed,
  isCurrentWeek,
  shiftMonth,
  shiftWeek,
  startOfMonth,
  startOfWeek,
} from "@/lib/study/week";

import styles from "./WeekPicker.module.css";

export type WeekPickerProps = {
  value: string;
  onValueChange: (weekStart: string) => void;
  id?: string;
  disabled?: boolean;
};

export function WeekPicker({
  value,
  onValueChange,
  id,
  disabled = false,
}: WeekPickerProps) {
  const selectedWeek = value || startOfWeek(new Date());
  const current = isCurrentWeek(selectedWeek);
  const rangeLabel = formatWeekRangeDetailed(selectedWeek);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedWeek),
  );

  const monthWeekOptions = useMemo(() => {
    const weeks = buildMonthWeeks(visibleMonth);
    return weeks
      .filter((week) => week.some((day) => day.inMonth))
      .map((week) => {
        const weekStart = week[0]?.weekStart ?? "";
        return {
          weekStart,
          label: formatWeekRangeDetailed(weekStart),
          isCurrent: isCurrentWeek(weekStart),
          isSelected: weekStart === selectedWeek,
        };
      });
  }, [visibleMonth, selectedWeek]);

  const monthTitle = useMemo(() => {
    const date = new Date(`${visibleMonth}T12:00:00`);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  }, [visibleMonth]);

  const selectWeek = (weekStart: string) => {
    onValueChange(weekStart);
    setVisibleMonth(startOfMonth(weekStart));
    setCalendarOpen(false);
  };

  const goToCurrentWeek = () => {
    selectWeek(startOfWeek(new Date()));
  };

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <div className={styles.rangeBlock}>
            <p className={styles.rangeEyebrow}>Study week</p>
            <p className={styles.rangeLabel} id={id}>
              {rangeLabel}
            </p>
            <p className={styles.rangeMeta}>Monday – Sunday</p>
          </div>
          {current ? (
            <span className={styles.badge}>This week</span>
          ) : (
            <button
              type="button"
              className={styles.badgeButton}
              onClick={goToCurrentWeek}
              disabled={disabled}
            >
              Jump to this week
            </button>
          )}
        </div>

        <div className={styles.navRow}>
          <button
            type="button"
            className={styles.navButton}
            aria-label="Previous week"
            disabled={disabled}
            onClick={() => onValueChange(shiftWeek(selectedWeek, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </button>

          <div
            className={styles.weekBlock}
            aria-label={`Selected week ${rangeLabel}`}
            data-current={current ? "" : undefined}
          >
            <span className={styles.weekBlockEyebrow}>Week of</span>
            <span className={styles.weekBlockLabel}>{rangeLabel}</span>
          </div>

          <button
            type="button"
            className={styles.navButton}
            aria-label="Next week"
            disabled={disabled}
            onClick={() => onValueChange(shiftWeek(selectedWeek, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>

        <Popover
          open={calendarOpen}
          onOpenChange={(open) => {
            setCalendarOpen(open);
            if (open) {
              setVisibleMonth(startOfMonth(selectedWeek));
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={styles.calendarTrigger}
              disabled={disabled}
              aria-label="Choose another week"
            >
              <CalendarDays className={styles.calendarIcon} aria-hidden="true" />
              Choose another week
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            sideOffset={8}
            className={`w-[min(calc(100vw-2rem),22rem)] border-0 bg-transparent p-0 shadow-none ${styles.popover}`}
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <div className={styles.monthHeader}>
              <button
                type="button"
                className={styles.monthNav}
                aria-label="Previous month"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <p className={styles.monthTitle}>{monthTitle}</p>
              <button
                type="button"
                className={styles.monthNav}
                aria-label="Next month"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>

            <p className={styles.calendarHint}>
              Select a full Mon–Sun study week
            </p>

            <ul className={styles.weekList} aria-label={`Weeks in ${monthTitle}`}>
              {monthWeekOptions.map((option) => (
                <li key={option.weekStart}>
                  <button
                    type="button"
                    className={styles.weekOption}
                    data-selected={option.isSelected ? "" : undefined}
                    data-current={option.isCurrent ? "" : undefined}
                    aria-pressed={option.isSelected}
                    onClick={() => selectWeek(option.weekStart)}
                  >
                    <span className={styles.weekOptionLabel}>{option.label}</span>
                    {option.isCurrent ? (
                      <span className={styles.weekOptionBadge}>This week</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={styles.todayButton}
              onClick={goToCurrentWeek}
            >
              Use this week
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
