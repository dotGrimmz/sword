"use client";

import { useMemo, type ReactNode, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";

import { BottomNavigation } from "@/components/BottomNavigation";
import { ThemeProvider, type Theme } from "@/components/ThemeContext";
import { TranslationProvider } from "@/components/TranslationContext";
import { Toaster } from "@/components/ui/sonner";
import {
  getRouteForScreen,
  getScreenForPath,
  screenRoutes,
  type ScreenKey,
} from "@/components/app-navigation";
import { ProfileProvider, type UserRole } from "@/components/ProfileContext";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: ReactNode;
  initialTheme?: Theme | null;
  initialRole?: UserRole | null;
};

export function AppShell({
  children,
  initialTheme,
  initialRole,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const currentScreen: ScreenKey = useMemo(
    () => getScreenForPath(pathname ?? "/dashboard"),
    [pathname]
  );

  const handleNavigate = (nextScreen: string) => {
    const target = getRouteForScreen(nextScreen);
    if (target !== pathname) {
      router.push(target);
    }
  };

  const bottomNavHeight = "104px";

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <ProfileProvider initialRole={initialRole}>
        <TranslationProvider>
          <div
            className={styles.container}
            style={{ "--bottom-nav-height": bottomNavHeight } as CSSProperties}
          >
            <div className={styles.surface}>
              <div className={styles.surfaceInner}>
                <div className={styles.frame}>
                  <div className={styles.content}>{children}</div>
                </div>
              </div>
            </div>
            <BottomNavigation
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
            />
            <Toaster position="top-center" />
          </div>
        </TranslationProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

export { screenRoutes };
