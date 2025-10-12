import { cn } from "@/components/ui/utils";
import type { Source } from "@/types/apologetics";
import styles from "./SourcePanel.module.css";

interface SourcePanelProps {
  sources: Source[] | null | undefined;
  className?: string;
  title?: string;
}

export function SourcePanel({
  sources,
  className,
  title = "Recommended Sources",
}: SourcePanelProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className={cn(styles.panel, className)}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.empty}>
          No sources are linked to this topic yet.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(styles.panel, className)}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {sources.map((source) => (
          <li key={source.id} className={styles.item}>
            <p className={styles.work}>
              {source.work ?? source.author ?? "Source"}
            </p>
            <p className={styles.meta}>
              {[source.author, source.year_or_era]
                .filter((part) => part && part.length > 0)
                .join(" · ")}
            </p>
            {source.location ? (
              <p className={styles.meta}>Location: {source.location}</p>
            ) : null}
            {source.notes ? (
              <p className={styles.notes}>{source.notes}</p>
            ) : null}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                View resource
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
