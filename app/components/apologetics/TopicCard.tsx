import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/components/ui/utils";
import { normalizeTags } from "@/lib/api/apologetics";
import type { Topic } from "@/types/apologetics";
import styles from "./TopicCard.module.css";

const difficultyLabel = (value?: string | null) => {
  switch (value) {
    case "intro":
      return "Intro";
    case "intermediate":
      return "Intermediate";
    case "advanced":
      return "Advanced";
    default:
      return value ? value : null;
  }
};

const formatMinutes = (minutes?: number | null) => {
  if (!minutes) return null;
  return `${minutes} min`;
};

interface TopicCardProps {
  topic: Topic;
  href?: string;
  className?: string;
  showSummary?: boolean;
}

export function TopicCard({
  topic,
  href,
  className,
  showSummary = true,
}: TopicCardProps) {
  const title = topic.title ?? topic.objection ?? "Untitled Topic";
  const summary = topic.summary ?? topic.claim ?? null;
  const tags = normalizeTags(topic.tags);
  const difficulty = difficultyLabel(topic.difficulty);
  const estMinutes = formatMinutes(topic.est_minutes);

  const card = (
    <Card className={cn(styles.card, className)}>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.title}>{title}</CardTitle>
        {showSummary && summary ? (
          <CardDescription className={styles.description}>
            {summary}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className={styles.content}>
        <div className={styles.meta}>
          {difficulty ? (
            <span className={styles.metaChip}>{difficulty}</span>
          ) : null}
          {estMinutes ? (
            <span className={styles.metaChip}>{estMinutes}</span>
          ) : null}
        </div>

        {tags.length ? (
          <div className={styles.tagList}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className={styles.footer}>
        {href ? <span className={styles.footerLink}>View topic</span> : null}
      </CardFooter>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className={styles.link}>
        {card}
      </Link>
    );
  }

  return card;
}
