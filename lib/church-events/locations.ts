import type { SupabaseClient } from "@supabase/supabase-js";

import type { EventLocation, EventLocationInput } from "@/types/events";

const LOCATION_SELECT =
  "id, name, address, notes, created_at, updated_at";

type Client = SupabaseClient;

const trimOrNull = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function normalizeLocationRow(
  row: Record<string, unknown>,
): EventLocation {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    address: String(row.address ?? ""),
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function normalizeLocationInput(
  payload: Record<string, unknown>,
): EventLocationInput {
  const name = trimOrNull(payload.name);
  const address = trimOrNull(payload.address);
  if (!name) throw new Error("Name is required");
  if (!address) throw new Error("Address is required");
  return {
    name,
    address,
    notes: trimOrNull(payload.notes),
  };
}

export async function listEventLocations(
  client: Client,
): Promise<EventLocation[]> {
  const { data, error } = await client
    .from("event_locations")
    .select(LOCATION_SELECT)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    normalizeLocationRow(row as Record<string, unknown>),
  );
}

export async function getEventLocation(
  client: Client,
  id: string,
): Promise<EventLocation | null> {
  const { data, error } = await client
    .from("event_locations")
    .select(LOCATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeLocationRow(data as Record<string, unknown>);
}

export async function createEventLocation(
  client: Client,
  input: EventLocationInput,
): Promise<EventLocation> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("event_locations")
    .insert({
      name: input.name,
      address: input.address,
      notes: input.notes ?? null,
      created_at: now,
      updated_at: now,
    } as never)
    .select(LOCATION_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return normalizeLocationRow(data as Record<string, unknown>);
}

export async function updateEventLocation(
  client: Client,
  id: string,
  input: EventLocationInput,
): Promise<EventLocation> {
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("event_locations")
    .update({
      name: input.name,
      address: input.address,
      notes: input.notes ?? null,
      updated_at: now,
    } as never)
    .eq("id", id)
    .select(LOCATION_SELECT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Location not found");

  const location = normalizeLocationRow(data as Record<string, unknown>);

  // Keep denormalized venue/address in sync for linked series.
  const { error: syncError } = await client
    .from("event_series")
    .update({
      venue: location.name,
      address: location.address,
      updated_at: now,
    } as never)
    .eq("location_id", id);

  if (syncError) throw new Error(syncError.message);

  return location;
}

export async function deleteEventLocation(
  client: Client,
  id: string,
): Promise<void> {
  const { error } = await client.from("event_locations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
