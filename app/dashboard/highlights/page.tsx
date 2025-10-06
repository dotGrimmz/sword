"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { HighlightsScreen } from "@/components/HighlightsScreen";
import { getRouteForScreen } from "@/components/app-navigation";

export default function HighlightsPage() {
  const router = useRouter();

  const handleNavigate = useCallback(
    (screen: string) => {
      router.push(getRouteForScreen(screen));
    },
    [router],
  );

  return <HighlightsScreen onNavigate={handleNavigate} />;
}
