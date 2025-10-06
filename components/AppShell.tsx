"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeProvider } from "@/components/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import {
  getRouteForScreen,
  getScreenForPath,
  screenRoutes,
  type ScreenKey,
} from "@/components/app-navigation";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentScreen: ScreenKey = useMemo(() => getScreenForPath(pathname ?? "/app"), [pathname]);

  const handleNavigate = (nextScreen: string) => {
    const target = getRouteForScreen(nextScreen);
    if (target !== pathname) {
      router.push(target);
    }
  };

  return (
    <ThemeProvider>
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl justify-center bg-muted/30 px-4 py-6 sm:px-6">
        <div className="relative flex h-full min-h-[720px] w-full max-w-xl flex-1 flex-col overflow-hidden rounded-3xl border border-border/40 bg-background shadow-xl">
          <div className="flex-1 overflow-hidden">{children}</div>
          <BottomNavigation currentScreen={currentScreen} onNavigate={handleNavigate} />
        </div>
      </div>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}

export { screenRoutes };
