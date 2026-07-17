import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/utils";

type PageLoadingProps = {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  /** Full viewport page shell vs nested section placeholder. */
  variant?: "page" | "section";
};

/**
 * Responsive page-level loading UI (Tailwind).
 * Safe for RSC `loading.tsx` and client screens.
 */
export function PageLoading({
  title = "Preparing your study space…",
  subtitle = "Please wait while we gather everything you need.",
  icon,
  className,
  variant = "page",
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        "box-border flex w-full items-center justify-center",
        variant === "page"
          ? [
              "min-h-[calc(100dvh-var(--bottom-nav-height,7rem))]",
              "bg-gradient-to-b from-background via-secondary/20 to-background",
              "px-5 py-9 sm:px-8 sm:py-12 md:px-10",
            ]
          : [
              "mx-auto my-3 w-full max-w-xl sm:my-6",
              "min-h-[13.75rem] sm:min-h-[16rem] md:min-h-[20rem]",
              "rounded-2xl sm:rounded-3xl",
              "bg-gradient-to-b from-background/90 to-secondary/30",
              "px-4 py-6 sm:px-8 sm:py-9",
            ],
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={cn(
          "relative flex w-full flex-col items-center gap-4 text-center",
          "rounded-2xl border border-border/20 bg-card/90 shadow-xl backdrop-blur-md",
          "px-6 py-7 sm:gap-5 sm:rounded-3xl sm:px-9 sm:py-9",
          variant === "page"
            ? "max-w-[20rem] sm:max-w-[22.5rem] md:max-w-sm"
            : "max-w-full sm:max-w-[22.5rem]",
        )}
      >
        <div
          className="pointer-events-none absolute -inset-x-4 -inset-y-5 animate-pulse bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_65%)] opacity-70"
          aria-hidden="true"
        />

        <div
          className={cn(
            "relative flex items-center justify-center rounded-full",
            "h-16 w-16 sm:h-[5.25rem] sm:w-[5.25rem]",
            "bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--primary)_32%,transparent),color-mix(in_oklab,var(--primary)_8%,transparent))]",
            "shadow-[inset_0_2px_10px_rgba(255,255,255,0.65),0_12px_30px_color-mix(in_oklab,var(--primary)_25%,transparent)]",
          )}
        >
          {icon ?? (
            <Image
              src="/sword_logo.png"
              alt=""
              width={56}
              height={56}
              className="h-11 w-11 animate-pulse object-contain drop-shadow-md sm:h-14 sm:w-14"
              priority
            />
          )}
        </div>

        <p className="relative m-0 text-sm font-medium text-foreground sm:text-[0.9375rem]">
          {title}
        </p>
        {subtitle ? (
          <p className="relative m-0 max-w-[18rem] text-xs text-muted-foreground sm:max-w-xs sm:text-[0.8125rem]">
            {subtitle}
          </p>
        ) : null}

        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}
