import type { ReactNode } from "react";

import { PageLoading } from "@/components/PageLoading";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  variant?: "page" | "section";
}

/** @deprecated Prefer `PageLoading` — kept as a thin alias for existing screens. */
export function LoadingScreen(props: LoadingScreenProps) {
  return <PageLoading {...props} />;
}
