"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { BibleReaderScreen } from "@/components/BibleReaderScreen";
import { getRouteForScreen } from "@/components/app-navigation";

export default function ReaderPage() {
  const router = useRouter();

  const handleNavigate = useCallback(
    (screen: string) => {
      router.push(getRouteForScreen(screen));
    },
    [router],
  );

  return <BibleReaderScreen onNavigate={handleNavigate} />;
}
