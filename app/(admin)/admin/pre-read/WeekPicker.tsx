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
  daysOfWeek,
  formatWeekRangeDetailed,
  isCurrentWeek,
  shiftMonth,
  shiftWeek,
  startOfMonth,
  startOfWeek,
  todayYmd,
} from "@/lib/study/week";

import styles from "./WeekPicker.module.css";

export type WeekPickerProps = {
  value: string;
  onValueChange: (weekStart: string) => void;
  id?: string;
  disabled?: boolean;
};

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekPicker({
  value,
  onValueChange,
  id,
  disabled = false,
}: WeekPickerProps) {
  const selectedWeek = value || startOfWeek(new Date());
  const current = isCurrentWeek(selectedWeek);
  const days = useMemo(() => daysOfWeek(selectedWeek), [selectedWeek]);
  const rangeLabel = formatWeekRangeDetailed(selectedWeek);
  const today = useMemo(() => todayYmd(), []);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedWeek),
  );
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);

  const monthWeeks = useMemo(
    () => buildMonthWeeks(visibleMonth),
    [visibleMonth],
  );

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
    setHoveredWeek(null);
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

          <ol className={styles.dayStrip} aria-label={`Week of ${rangeLabel}`}>
            {days.map((day) => (
              <li
                key={day.ymd}
                className={styles.dayCell}
                data-today={day.isToday ? "" : undefined}
              >
                <span className={styles.dayName}>{day.weekdayShort}</span>
                <span className={styles.dayNumber}>{day.dayOfMonth}</span>
              </li>
            ))}
          </ol>

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
              setHoveredWeek(null);
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
              Tap any day to select that whole week
            </p>

            <div className={styles.weekdayRow} aria-hidden="true">
              {WEEKDAY_HEADERS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className={styles.monthGrid} role="grid" aria-label={monthTitle}>
              {monthWeeks.map((week) => {
                const weekStart = week[0]?.weekStart ?? "";
                const isSelected = weekStart === selectedWeek;
                const isHovered = hoveredWeek === weekStart;
                const isThisWeek = isCurrentWeek(weekStart);
                return (
                  <div
                    key={weekStart}
                    role="row"
                    className={styles.weekRow}
                    data-selected={isSelected ? "" : undefined}
                    data-hovered={isHovered && !isSelected ? "" : undefined}
                    data-current={isThisWeek ? "" : undefined}
                    onMouseEnter={() => setHoveredWeek(weekStart)}
                    onMouseLeave={() => setHoveredWeek(null)}
                  >
                    {week.map((cell) => (
                      <button
                        key={cell.ymd}
                        type="button"
                        role="gridcell"
                        className={styles.dayButton}
                        data-outside={cell.inMonth ? undefined : ""}
                        data-today={cell.ymd === today ? "" : undefined}
                        aria-label={`Select week of ${formatWeekRangeDetailed(weekStart)}`}
                        aria-selected={isSelected}
                        onClick={() => selectWeek(weekStart)}
                        onFocus={() => setHoveredWeek(weekStart)}
                      >
                        {cell.dayOfMonth}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>

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
