import { CalendarClock, ExternalLink, Play } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/components/ui/utils";
import type { HostProfile } from "@/types/pre-read";

import styles from "./StreamHostCard.module.css";

const formatDateTime = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

type StreamHostCardProps = {
  host: HostProfile;
  streamStartTime: string | null;
  className?: string;
};

export function StreamHostCard({
  host,
  streamStartTime,
  className,
}: StreamHostCardProps) {
  const fallback =
    host.username
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "H";

  const startLabel = formatDateTime(streamStartTime);

  return (
    <div className={cn(styles.card, className)}>
      <div className={styles.header}>
        <Avatar className={styles.avatar}>
          {host.avatar_url ? (
            <AvatarImage src={host.avatar_url} alt={host.username ?? "Host"} />
          ) : null}
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div>
          <p className={styles.eyebrow}>Stream Host</p>
          <p className={styles.name}>{host.username ?? "Unnamed Host"}</p>
          {host.stream_tagline ? (
            <p className={styles.tagline}>{host.stream_tagline}</p>
          ) : null}
        </div>
      </div>

      <div className={styles.badgeGroup}>
        {startLabel ? (
          <span className={styles.badge}>
            <CalendarClock className={styles.badgeIcon} aria-hidden="true" />
            {startLabel}
          </span>
        ) : null}
        {host.stream_url ? (
          <Link
            href={host.stream_url}
            className={styles.link}
            rel="noreferrer"
            target="_blank"
          >
            <Play className={styles.linkIcon} aria-hidden="true" />
            Join Stream
            <ExternalLink className={styles.linkIcon} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
