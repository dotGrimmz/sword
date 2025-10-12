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
import { normalizeTags, sortPathTopics } from "@/lib/api/apologetics";
import type { Path } from "@/types/apologetics";
import styles from "./PathCard.module.css";

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

interface PathCardProps {
  path: Path;
  href?: string;
  className?: string;
}

export function PathCard({ path, href, className }: PathCardProps) {
  const tags = normalizeTags(path.tags);
  const difficulty = difficultyLabel(path.difficulty);
  const estMinutes = formatMinutes(path.est_minutes);
  const topics = sortPathTopics(path.path_topics ?? []).map(
    (entry) => entry.topics,
  );

  const card = (
    <Card className={cn(styles.card, className)}>
      <CardHeader className={styles.header}>
        <CardTitle className={styles.title}>{path.title}</CardTitle>
        {path.subtitle ? (
          <CardDescription className={styles.subtitle}>
            {path.subtitle}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className={styles.content}>
        {path.description ? (
          <p className={styles.description}>{path.description}</p>
        ) : null}

        <div className={styles.meta}>
          {difficulty ? (
            <span className={styles.metaChip}>{difficulty}</span>
          ) : null}
          {estMinutes ? (
            <span className={styles.metaChip}>{estMinutes}</span>
          ) : null}
          {topics.length ? (
            <span className={styles.metaChip}>
              {topics.length} topic{topics.length === 1 ? "" : "s"}
            </span>
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

        {topics.length ? (
          <div className={styles.topicList}>
            <p className={styles.topicHeading}>Includes</p>
            {topics.slice(0, 3).map(
              (topic) =>
                topic && (
                  <p key={topic.id} className={styles.topicItem} title={topic.title}>
                    {topic.title}
                  </p>
                ),
            )}
            {topics.length > 3 ? (
              <p className={styles.topicItem}>
                +{topics.length - 3} more topics
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className={styles.footer}>
        {href ? <span className={styles.footerLink}>View path</span> : null}
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
