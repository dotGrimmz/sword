"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { MemoryScreen } from "@/components/MemoryScreen";
import { getRouteForScreen } from "@/components/app-navigation";

export default function MemoryPage() {
  const router = useRouter();

  const handleNavigate = useCallback(
    (screen: string) => {
      router.push(getRouteForScreen(screen));
    },
    [router],
  );

  return <MemoryScreen onNavigate={handleNavigate} />;
}
