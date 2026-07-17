export function formatEventWhen(
  startsAt: string,
  endsAt: string | null,
  timeZone = "America/New_York",
): string {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return "Date TBA";

  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });

  const startTime = timeFmt.format(start);
  if (!endsAt) return `${datePart} · ${startTime}`;

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return `${datePart} · ${startTime}`;
  return `${datePart} · ${startTime}–${timeFmt.format(end)}`;
}

export function locationLabel(
  locationType: "in_person" | "online" | "hybrid",
  venue: string | null,
  address: string | null,
): string {
  if (locationType === "online") return "Online";
  const place = venue || address;
  if (locationType === "hybrid") {
    return place ? `Hybrid · ${place}` : "Hybrid";
  }
  return place || "In person";
}
