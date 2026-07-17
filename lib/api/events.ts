import { apiFetch } from "@/lib/api/fetch";
import type {
  EventOccurrence,
  EventOccurrenceSummary,
  EventSeriesInput,
  EventSeriesWithOccurrences,
} from "@/types/events";

export const listUpcomingEvents = () =>
  apiFetch<{ events: EventOccurrenceSummary[] }>("/api/events");

export const listPastEvents = () =>
  apiFetch<{ events: EventOccurrenceSummary[] }>("/api/events?past=1");

export const getNextHomeEvent = () =>
  apiFetch<{ event: EventOccurrenceSummary | null }>("/api/events?home=1");

export const getPublicEventSeries = (id: string) =>
  apiFetch<{ series: EventSeriesWithOccurrences }>(`/api/events/${id}`);

export const listAdminEventSeries = () =>
  apiFetch<{ series: EventSeriesWithOccurrences[] }>("/api/admin/events");

export const getAdminEventSeries = (id: string) =>
  apiFetch<{ series: EventSeriesWithOccurrences }>(`/api/admin/events/${id}`);

export const createAdminEventSeries = (input: EventSeriesInput) =>
  apiFetch<{ series: EventSeriesWithOccurrences }>("/api/admin/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const updateAdminEventSeries = (id: string, input: EventSeriesInput) =>
  apiFetch<{ series: EventSeriesWithOccurrences }>(`/api/admin/events/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

export const deleteAdminEventSeries = (id: string) =>
  apiFetch<{ ok: boolean }>(`/api/admin/events/${id}`, {
    method: "DELETE",
  });

export async function uploadAdminEventCover(
  file: File,
  previousUrl?: string | null,
) {
  const body = new FormData();
  body.set("file", file);
  if (previousUrl) {
    body.set("previous_url", previousUrl);
  }
  return apiFetch<{ url: string }>("/api/admin/events/cover", {
    method: "POST",
    body,
  });
}

export const removeAdminEventCover = (url: string) =>
  apiFetch<{ ok: boolean }>("/api/admin/events/cover", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

export const cancelAdminOccurrence = (occurrenceId: string) =>
  apiFetch<{ occurrence: EventOccurrence }>(
    `/api/admin/events/occurrences/${occurrenceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    },
  );
