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
    <Card className={cn("h-full transition hover:border-primary/40", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-100">
          {title}
        </CardTitle>
        {showSummary && summary ? (
          <CardDescription className="text-slate-300">
            {summary}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-3">
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
      </CardContent>

      <CardFooter className="pt-0 text-sm text-primary">
        {href ? <span>View topic →</span> : null}
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
