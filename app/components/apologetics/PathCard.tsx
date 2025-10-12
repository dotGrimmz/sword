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
    <Card className={cn("h-full transition hover:border-primary/40", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-100">
          {path.title}
        </CardTitle>
        {path.subtitle ? (
          <CardDescription className="text-slate-300">
            {path.subtitle}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {path.description ? (
          <p className="text-sm text-slate-300">{path.description}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-slate-400">
          {difficulty ? (
            <span className="rounded-full border border-slate-700 px-2 py-1 text-[0.65rem] font-semibold">
              {difficulty}
            </span>
          ) : null}
          {estMinutes ? (
            <span className="rounded-full border border-slate-700 px-2 py-1 text-[0.65rem] font-semibold">
              {estMinutes}
            </span>
          ) : null}
          {topics.length ? (
            <span className="rounded-full border border-slate-700 px-2 py-1 text-[0.65rem] font-semibold">
              {topics.length} topic{topics.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-800/60 px-2 py-1 text-xs text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {topics.length ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Includes
            </p>
            <ul className="space-y-1 text-sm text-slate-300">
              {topics.slice(0, 3).map(
                (topic) =>
                  topic && (
                    <li key={topic.id} className="truncate" title={topic.title}>
                      {topic.title}
                    </li>
                  ),
              )}
              {topics.length > 3 ? (
                <li className="text-slate-500">
                  +{topics.length - 3} more topics
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="pt-0 text-sm text-primary">
        {href ? <span>View path →</span> : null}
      </CardFooter>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {card}
      </Link>
    );
  }

  return card;
}
