"use client";

import { LoadingScreen } from "@/components/LoadingScreen";

export default function PathLoading() {
  return (
    <LoadingScreen
      title="Loading path…"
      subtitle="Collecting ordered topics for this journey."
      variant="page"
    />
  );
}
