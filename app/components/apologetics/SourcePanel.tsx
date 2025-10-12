import { cn } from "@/components/ui/utils";
import type { Source } from "@/types/apologetics";

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
      <div className={cn("rounded-xl border border-slate-800 p-6", className)}>
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">
          No sources are linked to this topic yet.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-slate-800 p-6", className)}>
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <ul className="mt-4 space-y-4">
        {sources.map((source) => (
          <li key={source.id} className="space-y-1 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">
              {source.work ?? source.author ?? "Source"}
            </p>
            <p className="text-slate-400">
              {[source.author, source.year_or_era]
                .filter((part) => part && part.length > 0)
                .join(" · ")}
            </p>
            {source.location ? (
              <p className="text-slate-400">Location: {source.location}</p>
            ) : null}
            {source.notes ? (
              <p className="text-slate-300">{source.notes}</p>
            ) : null}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm font-medium text-primary hover:underline"
              >
                View resource →
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
