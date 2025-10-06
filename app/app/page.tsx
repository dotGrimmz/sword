"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { HomeScreen } from "@/components/HomeScreen";
import { getRouteForScreen } from "@/components/app-navigation";

export default function AppHomePage() {
  const router = useRouter();

  const handleNavigate = useCallback(
    (screen: string) => {
      const target = getRouteForScreen(screen);
      router.push(target);
    },
    [router],
  );

  return <HomeScreen onNavigate={handleNavigate} />;
}
