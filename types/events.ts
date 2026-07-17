export type EventLocationType = "in_person" | "online" | "hybrid";
export type EventSeriesStatus = "draft" | "published" | "cancelled";
export type EventOccurrenceStatus = "scheduled" | "cancelled";
export type EventRecurrenceFrequency = "none" | "weekly" | "monthly";
export type EventRecurrenceEndType = "never" | "until" | "count";

export type EventSeries = {
  id: string;
  title: string;
  description: string | null;
  location_type: EventLocationType;
  venue: string | null;
  address: string | null;
  join_url: string | null;
  cover_url: string | null;
  timezone: string;
  status: EventSeriesStatus;
  pre_read_id: string | null;
  starts_at: string;
  ends_at: string | null;
  recurrence_frequency: EventRecurrenceFrequency;
  recurrence_interval: number;
  recurrence_weekdays: number[] | null;
  recurrence_end_type: EventRecurrenceEndType;
  recurrence_until: string | null;
  recurrence_count: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventOccurrence = {
  id: string;
  series_id: string;
  starts_at: string;
  ends_at: string | null;
  status: EventOccurrenceStatus;
  created_at: string;
  updated_at: string;
};

/** Occurrence joined with series fields for list/detail/home. */
export type EventOccurrenceSummary = {
  id: string;
  series_id: string;
  starts_at: string;
  ends_at: string | null;
  status: EventOccurrenceStatus;
  title: string;
  description: string | null;
  location_type: EventLocationType;
  venue: string | null;
  address: string | null;
  join_url: string | null;
  cover_url: string | null;
  timezone: string;
  series_status: EventSeriesStatus;
  pre_read_id: string | null;
  recurrence_frequency: EventRecurrenceFrequency;
};

export type EventSeriesInput = {
  title: string;
  description?: string | null;
  location_type: EventLocationType;
  venue?: string | null;
  address?: string | null;
  join_url?: string | null;
  cover_url?: string | null;
  timezone?: string;
  status?: EventSeriesStatus;
  pre_read_id?: string | null;
  starts_at: string;
  ends_at?: string | null;
  recurrence_frequency?: EventRecurrenceFrequency;
  recurrence_interval?: number;
  recurrence_weekdays?: number[] | null;
  recurrence_end_type?: EventRecurrenceEndType;
  recurrence_until?: string | null;
  recurrence_count?: number | null;
};

export type EventSeriesWithOccurrences = EventSeries & {
  occurrences: EventOccurrence[];
  next_occurrence: EventOccurrence | null;
};
