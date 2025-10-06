"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { NotesScreen } from "@/components/NotesScreen";
import { getRouteForScreen } from "@/components/app-navigation";

export default function NotesPage() {
  const router = useRouter();

  const handleNavigate = useCallback(
    (screen: string) => {
      router.push(getRouteForScreen(screen));
    },
    [router],
  );

  return <NotesScreen onNavigate={handleNavigate} />;
}
