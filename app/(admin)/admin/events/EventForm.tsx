"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cancelAdminOccurrence,
  createAdminEventSeries,
  deleteAdminEventSeries,
  removeAdminEventCover,
  updateAdminEventSeries,
  uploadAdminEventCover,
} from "@/lib/api/events";
import { formatEventWhen } from "@/lib/church-events/format";
import type {
  EventLocationType,
  EventRecurrenceEndType,
  EventRecurrenceFrequency,
  EventSeriesStatus,
  EventSeriesWithOccurrences,
} from "@/types/events";
import type { PreRead } from "@/types/pre-read";

import styles from "./EventForm.module.css";

/** Bigger tap targets on mobile; comfortable padded size from md up. */
const btnSecondary =
  "h-14 min-h-14 min-w-[8.5rem] px-6 text-base md:h-11 md:min-h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-[#e0c4b6] bg-white text-[#1a1a1a] hover:border-[#d91f26] hover:bg-[#d91f26]/10 hover:text-[#d91f26]";
const btnPrimary =
  "h-14 min-h-14 min-w-[8.5rem] px-6 text-base md:h-11 md:min-h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-0 bg-gradient-to-br from-[#d91f26] to-[#f28c00] text-white font-bold shadow-[0_10px_24px_color-mix(in_oklab,#d91f26_28%,transparent)] hover:brightness-105 hover:text-white";
const btnDanger =
  "h-14 min-h-14 min-w-[8.5rem] px-6 text-base md:h-11 md:min-h-11 md:min-w-[7.5rem] md:px-6 md:text-sm border-[#e0c4b6] bg-white text-[#d91f26] hover:border-[#d91f26] hover:bg-[#d91f26]/10";

type EventFormProps = {
  mode: "create" | "edit";
  initialSeries?: EventSeriesWithOccurrences | null;
  studies: Pick<PreRead, "id" | "title" | "book" | "chapter" | "week_start">[];
};

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function EventForm({
  mode,
  initialSeries,
  studies,
}: EventFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialSeries?.title ?? "");
  const [description, setDescription] = useState(
    initialSeries?.description ?? "",
  );
  const [locationType, setLocationType] = useState<EventLocationType>(
    initialSeries?.location_type ?? "in_person",
  );
  const [venue, setVenue] = useState(initialSeries?.venue ?? "");
  const [address, setAddress] = useState(initialSeries?.address ?? "");
  const [joinUrl, setJoinUrl] = useState(initialSeries?.join_url ?? "");
  const [coverUrl, setCoverUrl] = useState(initialSeries?.cover_url ?? "");
  const [timezone, setTimezone] = useState(
    initialSeries?.timezone ?? "America/New_York",
  );
  const [status, setStatus] = useState<EventSeriesStatus>(
    initialSeries?.status ?? "draft",
  );
  const [preReadId, setPreReadId] = useState(initialSeries?.pre_read_id ?? "");
  const [startsAt, setStartsAt] = useState(
    toLocalInput(initialSeries?.starts_at) || toLocalInput(new Date().toISOString()),
  );
  const [endsAt, setEndsAt] = useState(toLocalInput(initialSeries?.ends_at));
  const [frequency, setFrequency] = useState<EventRecurrenceFrequency>(
    initialSeries?.recurrence_frequency ?? "none",
  );
  const [interval, setInterval] = useState(
    String(initialSeries?.recurrence_interval ?? 1),
  );
  const [weekdays, setWeekdays] = useState<number[]>(
    initialSeries?.recurrence_weekdays ?? [],
  );
  const [endType, setEndType] = useState<EventRecurrenceEndType>(
    initialSeries?.recurrence_end_type ?? "never",
  );
  const [until, setUntil] = useState(initialSeries?.recurrence_until ?? "");
  const [count, setCount] = useState(
    String(initialSeries?.recurrence_count ?? 8),
  );
  const [occurrences, setOccurrences] = useState(
    initialSeries?.occurrences ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return occurrences
      .filter((occ) => new Date(occ.starts_at).getTime() >= now)
      .slice(0, 12);
  }, [occurrences]);

  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleSubmit = async (nextStatus?: EventSeriesStatus) => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!startsAt) {
      toast.error("Start time is required");
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      location_type: locationType,
      venue: venue.trim() || null,
      address: address.trim() || null,
      join_url: joinUrl.trim() || null,
      cover_url: coverUrl.trim() || null,
      timezone,
      status: nextStatus ?? status,
      pre_read_id: preReadId || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      recurrence_frequency: frequency,
      recurrence_interval: Math.max(1, Number(interval) || 1),
      recurrence_weekdays: frequency === "weekly" ? weekdays : null,
      recurrence_end_type: endType,
      recurrence_until: endType === "until" ? until || null : null,
      recurrence_count:
        endType === "count" ? Math.max(1, Number(count) || 1) : null,
    };

    try {
      const { series } =
        mode === "edit" && initialSeries
          ? await updateAdminEventSeries(initialSeries.id, payload)
          : await createAdminEventSeries(payload);

      setStatus(series.status);
      setOccurrences(series.occurrences);
      toast.success(mode === "edit" ? "Event updated" : "Event created");
      if (mode === "create") {
        router.replace(`/admin/events/${series.id}/edit`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save event",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setUploadingCover(true);
    try {
      const { url } = await uploadAdminEventCover(file, coverUrl || null);
      setCoverUrl(url);
      toast.success("Cover uploaded");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload cover",
      );
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverClear = async () => {
    if (!coverUrl) return;
    setUploadingCover(true);
    try {
      await removeAdminEventCover(coverUrl);
      setCoverUrl("");
      toast.success("Cover removed");
    } catch (error) {
      // Still clear the field if storage delete fails on a non-bucket URL.
      setCoverUrl("");
      toast.error(
        error instanceof Error ? error.message : "Unable to remove cover",
      );
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDelete = async () => {
    if (!initialSeries || mode !== "edit") return;
    const confirmed = window.confirm(
      "Delete this event series and all of its dates? This cannot be undone.",
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteAdminEventSeries(initialSeries.id);
      toast.success("Event deleted");
      router.push("/admin/events");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete event",
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelOccurrence = async (occurrenceId: string) => {
    setCancellingId(occurrenceId);
    try {
      await cancelAdminOccurrence(occurrenceId);
      setOccurrences((prev) =>
        prev.map((occ) =>
          occ.id === occurrenceId ? { ...occ, status: "cancelled" } : occ,
        ),
      );
      toast.success("Occurrence cancelled");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to cancel occurrence",
      );
    } finally {
      setCancellingId(null);
    }
  };

  const busy = saving || deleting || uploadingCover;

  return (
    <div className={styles.formShell}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <p className={styles.toolbarEyebrow}>
            {mode === "create" ? "New event" : "Edit event"}
          </p>
          <p className={styles.toolbarTitle}>
            {title.trim() || "Untitled gathering"}
          </p>
        </div>
        <div className={styles.toolbarActions}>
          <Button
            type="button"
            variant="outline"
            className={btnSecondary}
            disabled={busy}
            onClick={() => void handleSubmit("draft")}
          >
            Save draft
          </Button>
          <Button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => void handleSubmit("published")}
          >
            {saving ? "Saving…" : "Publish"}
          </Button>
        </div>
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>1 · Basics</p>
            <h3 className={styles.sectionTitle}>Event details</h3>
            <p className={styles.sectionMeta}>
              Title, status, and what people should expect.
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className={styles.label} htmlFor="event-title">
                Title
              </label>
              <Input
                id="event-title"
                className={styles.control}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Midweek Bible Study"
                required
              />
            </div>

            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Status</span>
              <div
                className={styles.segmentGroup}
                role="group"
                aria-label="Event status"
              >
                {(
                  [
                    ["draft", "Draft"],
                    ["published", "Published"],
                    ["cancelled", "Cancelled"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.segment} ${
                      status === value ? styles.segmentActive : ""
                    }`}
                    onClick={() => setStatus(value)}
                    disabled={busy}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className={styles.label} htmlFor="event-description">
                Description
              </label>
              <textarea
                id="event-description"
                className={styles.control}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should people expect?"
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>2 · When & where</p>
            <h3 className={styles.sectionTitle}>Schedule and location</h3>
            <p className={styles.sectionMeta}>
              Set the first gathering time, place, and optional cover image.
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-starts">
                Starts
              </label>
              <Input
                id="event-starts"
                className={styles.control}
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-ends">
                Ends
              </label>
              <Input
                id="event-ends"
                className={styles.control}
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-tz">
                Timezone
              </label>
              <Input
                id="event-tz"
                className={styles.control}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <span className={styles.label}>Location type</span>
              <div
                className={styles.segmentGroup}
                role="group"
                aria-label="Location type"
              >
                {(
                  [
                    ["in_person", "In person"],
                    ["online", "Online"],
                    ["hybrid", "Hybrid"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.segment} ${
                      locationType === value ? styles.segmentActive : ""
                    }`}
                    onClick={() => setLocationType(value)}
                    disabled={busy}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-venue">
                Venue
              </label>
              <Input
                id="event-venue"
                className={styles.control}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Fellowship Hall"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-address">
                Address
              </label>
              <Input
                id="event-address"
                className={styles.control}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className={styles.label} htmlFor="event-join">
                Join URL
              </label>
              <Input
                id="event-join"
                className={styles.control}
                value={joinUrl}
                onChange={(e) => setJoinUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <span className={styles.label}>Cover / banner</span>
              <div className={styles.coverPanel}>
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="" className={styles.coverPreview} />
                ) : null}
                <label
                  className={`${styles.dropzone} ${
                    busy ? styles.dropzoneDisabled : ""
                  }`}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className={styles.uploadInput}
                    disabled={busy}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = "";
                      void handleCoverUpload(file);
                    }}
                  />
                  <span className={styles.dropzoneTitle}>
                    {uploadingCover
                      ? "Uploading…"
                      : coverUrl
                        ? "Replace cover image"
                        : "Upload cover image"}
                  </span>
                  <span className={styles.dropzoneMeta}>
                    PNG, JPEG, WebP, or GIF · max 5 MB
                  </span>
                </label>
                {coverUrl ? (
                  <div className={styles.coverActions}>
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSecondary}
                      disabled={busy}
                      onClick={() => void handleCoverClear()}
                    >
                      Remove cover
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className={styles.label} htmlFor="event-study">
                Linked Study (optional)
              </label>
              <select
                id="event-study"
                className={styles.control}
                value={preReadId}
                onChange={(e) => setPreReadId(e.target.value)}
              >
                <option value="">None</option>
                {studies.map((study) => (
                  <option key={study.id} value={study.id}>
                    {study.title || `${study.book} ${study.chapter}`}
                    {study.week_start ? ` (${study.week_start})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionEyebrow}>3 · Recurrence</p>
            <h3 className={styles.sectionTitle}>Repeat pattern</h3>
            <p className={styles.sectionMeta}>
              One-time by default, or set a weekly/monthly series.
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-freq">
                Frequency
              </label>
              <select
                id="event-freq"
                className={styles.control}
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as EventRecurrenceFrequency)
                }
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-interval">
                Interval
              </label>
              <Input
                id="event-interval"
                className={styles.control}
                type="number"
                min={1}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                disabled={frequency === "none"}
              />
              <p className={styles.helper}>1 = every week/month</p>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="event-end-type">
                Ends
              </label>
              <select
                id="event-end-type"
                className={styles.control}
                value={endType}
                onChange={(e) =>
                  setEndType(e.target.value as EventRecurrenceEndType)
                }
                disabled={frequency === "none"}
              >
                <option value="never">Never (show next 26)</option>
                <option value="until">On date</option>
                <option value="count">After count</option>
              </select>
            </div>
            {endType === "until" ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="event-until">
                  Until
                </label>
                <Input
                  id="event-until"
                  className={styles.control}
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  disabled={frequency === "none"}
                />
              </div>
            ) : null}
            {endType === "count" ? (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="event-count">
                  Count
                </label>
                <Input
                  id="event-count"
                  className={styles.control}
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  disabled={frequency === "none"}
                />
              </div>
            ) : null}
          </div>

          {frequency === "weekly" ? (
            <div className={styles.field}>
              <span className={styles.label}>Weekdays (optional filter)</span>
              <div
                className={styles.weekdayGrid}
                role="group"
                aria-label="Weekdays"
              >
                {WEEKDAYS.map((day) => {
                  const active = weekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={`${styles.weekdayChip} ${
                        active ? styles.weekdayChipActive : ""
                      }`}
                      aria-pressed={active}
                      onClick={() => toggleWeekday(day.value)}
                      disabled={busy}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className={styles.helper}>
                Leave unchecked to repeat from the start weekday only.
              </p>
            </div>
          ) : null}
        </section>

        {mode === "edit" && upcoming.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionEyebrow}>4 · Upcoming</p>
              <h3 className={styles.sectionTitle}>Upcoming occurrences</h3>
              <p className={styles.sectionMeta}>
                Cancel a single date without ending the series.
              </p>
            </div>
            <div className={styles.occurrenceList}>
              {upcoming.map((occ) => (
                <div key={occ.id} className={styles.occurrenceRow}>
                  <p
                    className={`${styles.occurrenceMeta} ${
                      occ.status === "cancelled" ? styles.cancelled : ""
                    }`}
                  >
                    {formatEventWhen(occ.starts_at, occ.ends_at, timezone)}
                    {occ.status === "cancelled" ? " · Cancelled" : ""}
                  </p>
                  {occ.status === "scheduled" ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={btnSecondary}
                      disabled={cancellingId === occ.id || busy}
                      onClick={() => void handleCancelOccurrence(occ.id)}
                    >
                      {cancellingId === occ.id ? "Cancelling…" : "Cancel date"}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className={styles.actions}>
          {mode === "edit" ? (
            <Button
              type="button"
              variant="outline"
              className={btnDanger}
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className={btnSecondary}
            disabled={busy}
            onClick={() => void handleSubmit("draft")}
          >
            Save draft
          </Button>
          <Button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => void handleSubmit("published")}
          >
            {saving ? "Saving…" : "Publish"}
          </Button>
        </div>
      </form>
    </div>
  );
}
