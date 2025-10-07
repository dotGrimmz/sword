"use client";

import { useMemo, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeProvider } from "@/components/ThemeContext";
import { TranslationProvider } from "@/components/TranslationContext";
import { Toaster } from "@/components/ui/sonner";
import {
  getRouteForScreen,
  getScreenForPath,
  screenRoutes,
  type ScreenKey,
} from "@/components/app-navigation";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentScreen: ScreenKey = useMemo(() => getScreenForPath(pathname ?? "/dashboard"), [pathname]);

  const handleNavigate = (nextScreen: string) => {
    const target = getRouteForScreen(nextScreen);
    if (target !== pathname) {
      router.push(target);
    }
  };

  const bottomNavHeight = "104px";

  return (
    <ThemeProvider>
      <TranslationProvider>
        <div
          className={styles.container}
          style={{ ["--bottom-nav-height" as const]: bottomNavHeight }}
        >
          <div className={styles.surface}>
            <div className={styles.surfaceInner}>
              <div className={styles.frame}>
                <div className={styles.content}>{children}</div>
              </div>
            </div>
          </div>
          <BottomNavigation currentScreen={currentScreen} onNavigate={handleNavigate} />
          <Toaster position="top-center" />
        </div>
      </TranslationProvider>
    </ThemeProvider>
  );
}

export { screenRoutes };
