import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeOccurrenceRow,
  normalizeSeriesRow,
  toOccurrenceSummary,
} from "@/lib/church-events/normalize";
import {
  generateOccurrences,
  seriesToRecurrenceSeed,
} from "@/lib/church-events/recurrence";
import type {
  EventOccurrence,
  EventOccurrenceSummary,
  EventSeries,
  EventSeriesInput,
  EventSeriesWithOccurrences,
} from "@/types/events";

const SERIES_SELECT = `
  id, title, description, location_type, venue, address, join_url, cover_url,
  timezone, status, pre_read_id, starts_at, ends_at,
  recurrence_frequency, recurrence_interval, recurrence_weekdays,
  recurrence_end_type, recurrence_until, recurrence_count,
  created_by, created_at, updated_at
`;

const OCCURRENCE_SELECT =
  "id, series_id, starts_at, ends_at, status, created_at, updated_at";

const HOME_WINDOW_DAYS = 14;

type Client = SupabaseClient;

export async function materializeOccurrences(
  client: Client,
  series: EventSeries,
): Promise<void> {
  const generated = generateOccurrences(seriesToRecurrenceSeed(series));

  const { data: existing, error: existingError } = await client
    .from("event_occurrences")
    .select(OCCURRENCE_SELECT)
    .eq("series_id", series.id);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingRows = (existing ?? []).map((row) =>
    normalizeOccurrenceRow(row as Record<string, unknown>),
  );
  const cancelledStarts = new Set(
    existingRows
      .filter((row) => row.status === "cancelled")
      .map((row) => new Date(row.starts_at).toISOString()),
  );

  // Drop future scheduled rows so we can rebuild from the series rule.
  // Preserve cancelled overrides by re-inserting them after delete.
  const { error: deleteError } = await client
    .from("event_occurrences")
    .delete()
    .eq("series_id", series.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  const rows = generated.map((item) => ({
    series_id: series.id,
    starts_at: item.starts_at,
    ends_at: item.ends_at,
    status: cancelledStarts.has(item.starts_at) ? "cancelled" : "scheduled",
    updated_at: new Date().toISOString(),
  }));

  // Also keep cancelled dates that fell outside regenerated set.
  for (const cancelled of existingRows.filter((row) => row.status === "cancelled")) {
    const key = new Date(cancelled.starts_at).toISOString();
    if (!rows.some((row) => row.starts_at === key)) {
      rows.push({
        series_id: series.id,
        starts_at: key,
        ends_at: cancelled.ends_at,
        status: "cancelled",
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (rows.length === 0) return;

  const { error: insertError } = await client
    .from("event_occurrences")
    .insert(rows as never);

  if (insertError) {
    throw new Error(insertError.message);
  }
}

export async function listAdminSeries(
  client: Client,
): Promise<EventSeriesWithOccurrences[]> {
  const { data, error } = await client
    .from("event_series")
    .select(SERIES_SELECT)
    .order("starts_at", { ascending: false });

  if (error) throw new Error(error.message);

  const seriesList = (data ?? []).map((row) =>
    normalizeSeriesRow(row as Record<string, unknown>),
  );

  if (seriesList.length === 0) return [];

  const { data: occData, error: occError } = await client
    .from("event_occurrences")
    .select(OCCURRENCE_SELECT)
    .in(
      "series_id",
      seriesList.map((series) => series.id),
    )
    .order("starts_at", { ascending: true });

  if (occError) throw new Error(occError.message);

  const occurrences = (occData ?? []).map((row) =>
    normalizeOccurrenceRow(row as Record<string, unknown>),
  );

  const now = Date.now();

  return seriesList.map((series) => {
    const seriesOcc = occurrences.filter((occ) => occ.series_id === series.id);
    const next =
      seriesOcc.find(
        (occ) =>
          occ.status === "scheduled" &&
          new Date(occ.starts_at).getTime() >= now,
      ) ?? null;
    return { ...series, occurrences: seriesOcc, next_occurrence: next };
  });
}

export async function getAdminSeries(
  client: Client,
  id: string,
): Promise<EventSeriesWithOccurrences | null> {
  const { data, error } = await client
    .from("event_series")
    .select(SERIES_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const series = normalizeSeriesRow(data as Record<string, unknown>);

  const { data: occData, error: occError } = await client
    .from("event_occurrences")
    .select(OCCURRENCE_SELECT)
    .eq("series_id", id)
    .order("starts_at", { ascending: true });

  if (occError) throw new Error(occError.message);

  const occurrences = (occData ?? []).map((row) =>
    normalizeOccurrenceRow(row as Record<string, unknown>),
  );
  const now = Date.now();
  const next =
    occurrences.find(
      (occ) =>
        occ.status === "scheduled" && new Date(occ.starts_at).getTime() >= now,
    ) ?? null;

  return { ...series, occurrences, next_occurrence: next };
}

export async function createSeries(
  client: Client,
  input: EventSeriesInput,
  createdBy: string,
): Promise<EventSeriesWithOccurrences> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("event_series")
    .insert({
      title: input.title,
      description: input.description ?? null,
      location_type: input.location_type,
      venue: input.venue ?? null,
      address: input.address ?? null,
      join_url: input.join_url ?? null,
      cover_url: input.cover_url ?? null,
      timezone: input.timezone ?? "America/New_York",
      status: input.status ?? "draft",
      pre_read_id: input.pre_read_id ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at ?? null,
      recurrence_frequency: input.recurrence_frequency ?? "none",
      recurrence_interval: input.recurrence_interval ?? 1,
      recurrence_weekdays: input.recurrence_weekdays ?? null,
      recurrence_end_type: input.recurrence_end_type ?? "never",
      recurrence_until: input.recurrence_until ?? null,
      recurrence_count: input.recurrence_count ?? null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    } as never)
    .select(SERIES_SELECT)
    .single();

  if (error) throw new Error(error.message);

  const series = normalizeSeriesRow(data as Record<string, unknown>);
  await materializeOccurrences(client, series);
  const full = await getAdminSeries(client, series.id);
  if (!full) throw new Error("Failed to load created series");
  return full;
}

export async function updateSeries(
  client: Client,
  id: string,
  input: EventSeriesInput,
): Promise<EventSeriesWithOccurrences> {
  const { data, error } = await client
    .from("event_series")
    .update({
      title: input.title,
      description: input.description ?? null,
      location_type: input.location_type,
      venue: input.venue ?? null,
      address: input.address ?? null,
      join_url: input.join_url ?? null,
      cover_url: input.cover_url ?? null,
      timezone: input.timezone ?? "America/New_York",
      status: input.status ?? "draft",
      pre_read_id: input.pre_read_id ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at ?? null,
      recurrence_frequency: input.recurrence_frequency ?? "none",
      recurrence_interval: input.recurrence_interval ?? 1,
      recurrence_weekdays: input.recurrence_weekdays ?? null,
      recurrence_end_type: input.recurrence_end_type ?? "never",
      recurrence_until: input.recurrence_until ?? null,
      recurrence_count: input.recurrence_count ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .select(SERIES_SELECT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Event series not found");

  const series = normalizeSeriesRow(data as Record<string, unknown>);
  await materializeOccurrences(client, series);
  const full = await getAdminSeries(client, series.id);
  if (!full) throw new Error("Failed to load updated series");
  return full;
}

export async function cancelOccurrence(
  client: Client,
  occurrenceId: string,
): Promise<EventOccurrence> {
  const { data, error } = await client
    .from("event_occurrences")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", occurrenceId)
    .select(OCCURRENCE_SELECT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Occurrence not found");
  return normalizeOccurrenceRow(data as Record<string, unknown>);
}

export async function listUpcomingOccurrences(
  client: Client,
  options?: { withinDays?: number | null },
): Promise<EventOccurrenceSummary[]> {
  const nowIso = new Date().toISOString();
  let query = client
    .from("event_occurrences")
    .select(
      `
      ${OCCURRENCE_SELECT},
      series:event_series!inner (
        ${SERIES_SELECT}
      )
    `,
    )
    .eq("status", "scheduled")
    .eq("series.status", "published")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });

  if (options?.withinDays != null) {
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + options.withinDays);
    query = query.lte("starts_at", until.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>;
    const seriesRaw = Array.isArray(record.series)
      ? (record.series[0] as Record<string, unknown> | undefined)
      : (record.series as Record<string, unknown> | undefined);
    if (!seriesRaw) return [];
    return [
      toOccurrenceSummary(
        normalizeOccurrenceRow(record),
        normalizeSeriesRow(seriesRaw),
      ),
    ];
  });
}

export async function listPastOccurrences(
  client: Client,
  limit = 20,
): Promise<EventOccurrenceSummary[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from("event_occurrences")
    .select(
      `
      ${OCCURRENCE_SELECT},
      series:event_series!inner (
        ${SERIES_SELECT}
      )
    `,
    )
    .eq("status", "scheduled")
    .eq("series.status", "published")
    .lt("starts_at", nowIso)
    .order("starts_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const record = row as Record<string, unknown>;
    const seriesRaw = Array.isArray(record.series)
      ? (record.series[0] as Record<string, unknown> | undefined)
      : (record.series as Record<string, unknown> | undefined);
    if (!seriesRaw) return [];
    return [
      toOccurrenceSummary(
        normalizeOccurrenceRow(record),
        normalizeSeriesRow(seriesRaw),
      ),
    ];
  });
}

export async function deleteSeries(client: Client, id: string): Promise<void> {
  const { error } = await client.from("event_series").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getPublicSeries(
  client: Client,
  seriesId: string,
): Promise<EventSeriesWithOccurrences | null> {
  const { data, error } = await client
    .from("event_series")
    .select(SERIES_SELECT)
    .eq("id", seriesId)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const series = normalizeSeriesRow(data as Record<string, unknown>);

  const { data: occData, error: occError } = await client
    .from("event_occurrences")
    .select(OCCURRENCE_SELECT)
    .eq("series_id", seriesId)
    .order("starts_at", { ascending: true });

  if (occError) throw new Error(occError.message);

  // Public RLS hides cancelled; admin client would see them — filter anyway.
  const occurrences = (occData ?? [])
    .map((row) => normalizeOccurrenceRow(row as Record<string, unknown>))
    .filter((occ) => occ.status === "scheduled");

  const now = Date.now();
  const next =
    occurrences.find((occ) => new Date(occ.starts_at).getTime() >= now) ?? null;

  return { ...series, occurrences, next_occurrence: next };
}

export async function getNextHomeEvent(
  client: Client,
): Promise<EventOccurrenceSummary | null> {
  const upcoming = await listUpcomingOccurrences(client, {
    withinDays: HOME_WINDOW_DAYS,
  });
  return upcoming[0] ?? null;
}
