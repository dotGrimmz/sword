"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { BookOpen, FileText, Heart, LayoutDashboard } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "./ui/utils";
import styles from "./BottomNavigation.module.css";
import { dashboardScreens } from "@/components/app-navigation";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import { getUserNotes } from "@/lib/api/notes";
import { getUserHighlights } from "@/lib/api/highlights";
import { useTranslationContext } from "./TranslationContext";

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

const navIconByScreen = {
  home: LayoutDashboard,
  reader: BookOpen,
  notes: FileText,
  highlights: Heart,
} as const;

const navItems = (
  ["home", "reader", "notes", "highlights"] as const
).map((screenKey) => ({
  id: dashboardScreens[screenKey].id,
  icon: navIconByScreen[screenKey],
  label: dashboardScreens[screenKey].label,
}));

export function BottomNavigation({
  currentScreen,
  onNavigate,
}: BottomNavigationProps) {
  const queryClient = useQueryClient();
  const { translationCode } = useTranslationContext();
  const translationKey = translationCode ?? "none";

  const prefetchScreen = useCallback(
    (screen: string) => {
      switch (screen) {
        case "home":
          void queryClient.prefetchQuery({
            queryKey: queryKeys.userNotesPreview(translationKey),
            queryFn: () => getUserNotes(10, translationCode ?? undefined),
            staleTime: STALE_TIMES.user,
          });
          void queryClient.prefetchQuery({
            queryKey: queryKeys.userHighlights(translationKey),
            queryFn: () => getUserHighlights(translationCode ?? undefined),
            staleTime: STALE_TIMES.user,
          });
          break;
        case "notes":
          void queryClient.prefetchQuery({
            queryKey: queryKeys.userNotes(translationKey),
            queryFn: () => getUserNotes(undefined, translationCode ?? undefined),
            staleTime: STALE_TIMES.user,
          });
          break;
        case "highlights":
          void queryClient.prefetchQuery({
            queryKey: queryKeys.userHighlights(translationKey),
            queryFn: () => getUserHighlights(translationCode ?? undefined),
            staleTime: STALE_TIMES.user,
          });
          break;
        default:
          break;
      }
    },
    [queryClient, translationCode, translationKey],
  );

  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <div className={styles.menu}>
          {navItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="nav"
                onClick={() => onNavigate(item.id)}
                onMouseEnter={() => prefetchScreen(item.id)}
                onFocus={() => prefetchScreen(item.id)}
                className={cn(styles.navButton, isActive && styles.navButtonActive)}
                aria-label={item.label}
                title={item.label}
              >
                <div className={styles.iconWrapper}>
                  <item.icon className={styles.navIcon} aria-hidden="true" />
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={styles.activeIndicator}
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </div>
                <span className={styles.navLabel}>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
