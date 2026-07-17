import type {
  EventLocationType,
  EventOccurrence,
  EventOccurrenceSummary,
  EventRecurrenceEndType,
  EventRecurrenceFrequency,
  EventSeries,
  EventSeriesInput,
  EventSeriesStatus,
} from "@/types/events";

const asLocationType = (value: unknown): EventLocationType => {
  if (value === "online" || value === "hybrid" || value === "in_person") {
    return value;
  }
  return "in_person";
};

const asStatus = (value: unknown): EventSeriesStatus => {
  if (value === "published" || value === "cancelled" || value === "draft") {
    return value;
  }
  return "draft";
};

const asFrequency = (value: unknown): EventRecurrenceFrequency => {
  if (value === "weekly" || value === "monthly" || value === "none") {
    return value;
  }
  return "none";
};

const asEndType = (value: unknown): EventRecurrenceEndType => {
  if (value === "until" || value === "count" || value === "never") {
    return value;
  }
  return "never";
};

const trimOrNull = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function normalizeSeriesRow(row: Record<string, unknown>): EventSeries {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: (row.description as string | null) ?? null,
    location_type: asLocationType(row.location_type),
    venue: (row.venue as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    join_url: (row.join_url as string | null) ?? null,
    cover_url: (row.cover_url as string | null) ?? null,
    timezone: String(row.timezone ?? "America/New_York"),
    status: asStatus(row.status),
    pre_read_id: (row.pre_read_id as string | null) ?? null,
    starts_at: String(row.starts_at),
    ends_at: (row.ends_at as string | null) ?? null,
    recurrence_frequency: asFrequency(row.recurrence_frequency),
    recurrence_interval: Number(row.recurrence_interval ?? 1) || 1,
    recurrence_weekdays: Array.isArray(row.recurrence_weekdays)
      ? (row.recurrence_weekdays as number[])
      : null,
    recurrence_end_type: asEndType(row.recurrence_end_type),
    recurrence_until: (row.recurrence_until as string | null) ?? null,
    recurrence_count:
      row.recurrence_count == null ? null : Number(row.recurrence_count),
    created_by: (row.created_by as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function normalizeOccurrenceRow(
  row: Record<string, unknown>,
): EventOccurrence {
  return {
    id: String(row.id),
    series_id: String(row.series_id),
    starts_at: String(row.starts_at),
    ends_at: (row.ends_at as string | null) ?? null,
    status: row.status === "cancelled" ? "cancelled" : "scheduled",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function toOccurrenceSummary(
  occurrence: EventOccurrence,
  series: EventSeries,
): EventOccurrenceSummary {
  return {
    id: occurrence.id,
    series_id: series.id,
    starts_at: occurrence.starts_at,
    ends_at: occurrence.ends_at,
    status: occurrence.status,
    title: series.title,
    description: series.description,
    location_type: series.location_type,
    venue: series.venue,
    address: series.address,
    join_url: series.join_url,
    cover_url: series.cover_url,
    timezone: series.timezone,
    series_status: series.status,
    pre_read_id: series.pre_read_id,
    recurrence_frequency: series.recurrence_frequency,
  };
}

export function normalizeSeriesInput(
  payload: Record<string, unknown>,
): EventSeriesInput {
  const title = trimOrNull(payload.title);
  if (!title) {
    throw new Error("Title is required");
  }

  const startsAt =
    typeof payload.starts_at === "string" ? payload.starts_at.trim() : "";
  if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) {
    throw new Error("starts_at must be a valid datetime");
  }

  const endsAt = trimOrNull(payload.ends_at);
  if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
    throw new Error("ends_at must be a valid datetime");
  }

  const frequency = asFrequency(payload.recurrence_frequency);
  const endType = asEndType(payload.recurrence_end_type);
  const interval = Math.max(1, Number(payload.recurrence_interval ?? 1) || 1);

  let weekdays: number[] | null = null;
  if (Array.isArray(payload.recurrence_weekdays)) {
    weekdays = payload.recurrence_weekdays
      .map((day) => Number(day))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    if (weekdays.length === 0) weekdays = null;
  }

  const status = payload.status == null ? undefined : asStatus(payload.status);

  return {
    title,
    description: trimOrNull(payload.description),
    location_type: asLocationType(payload.location_type),
    venue: trimOrNull(payload.venue),
    address: trimOrNull(payload.address),
    join_url: trimOrNull(payload.join_url),
    cover_url: trimOrNull(payload.cover_url),
    timezone: trimOrNull(payload.timezone) ?? "America/New_York",
    status,
    pre_read_id: trimOrNull(payload.pre_read_id),
    starts_at: new Date(startsAt).toISOString(),
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    recurrence_frequency: frequency,
    recurrence_interval: interval,
    recurrence_weekdays: frequency === "weekly" ? weekdays : null,
    recurrence_end_type: endType,
    recurrence_until:
      endType === "until" ? trimOrNull(payload.recurrence_until) : null,
    recurrence_count:
      endType === "count"
        ? Math.max(1, Number(payload.recurrence_count ?? 1) || 1)
        : null,
  };
}
