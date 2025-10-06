"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { SettingsScreen } from "@/components/SettingsScreen";
import { getRouteForScreen } from "@/components/app-navigation";

export default function SettingsPage() {
  const router = useRouter();

  const handleNavigate = useCallback(
    (screen: string) => {
      router.push(getRouteForScreen(screen));
    },
    [router],
  );

  return <SettingsScreen onNavigate={handleNavigate} />;
}
