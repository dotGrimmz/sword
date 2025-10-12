"use client";

import { LoadingScreen } from "@/components/LoadingScreen";

export default function TopicLoading() {
  return (
    <LoadingScreen
      title="Loading topic…"
      subtitle="Gathering evidence, counters, and sources."
      variant="page"
    />
  );
}
