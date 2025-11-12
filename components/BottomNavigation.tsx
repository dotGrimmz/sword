"use client";

import { useCallback } from "react";
import { Button } from "./ui/button";
import { Home, BookOpen, Heart, Brain, FileText, Book } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "./ui/utils";
import styles from "./BottomNavigation.module.css";
import { useDataCacheContext } from "@/lib/data-cache/DataCacheProvider";
import { getUserNotes } from "@/lib/api/notes";
import { getUserHighlights } from "@/lib/api/highlights";
import { getUserMemoryVerses } from "@/lib/api/memory";
import { useTranslationContext } from "./TranslationContext";

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  const dataCache = useDataCacheContext();
  const { translationCode } = useTranslationContext();
  const translationKey = translationCode ?? "none";

  const prefetchScreen = useCallback(
    (screen: string) => {
      const staleTime = 1000 * 60 * 5;
      switch (screen) {
        case "home":
          void dataCache.fetch(
            `user-notes-preview-${translationKey}`,
            () => getUserNotes(10, translationCode ?? undefined),
            { staleTime },
          );
          void dataCache.fetch(
            `user-highlights-${translationKey}`,
            () => getUserHighlights(translationCode ?? undefined),
            { staleTime },
          );
          void dataCache.fetch(
            `user-memory-verses-${translationKey}`,
            () => getUserMemoryVerses(translationCode ?? undefined),
            { staleTime },
          );
          break;
        case "notes":
          void dataCache.fetch(
            `user-notes-${translationKey}`,
            () => getUserNotes(undefined, translationCode ?? undefined),
            { staleTime },
          );
          break;
        case "highlights":
          void dataCache.fetch(
            `user-highlights-${translationKey}`,
            () => getUserHighlights(translationCode ?? undefined),
            { staleTime },
          );
          break;
        case "memory":
          void dataCache.fetch(
            `user-memory-verses-${translationKey}`,
            () => getUserMemoryVerses(translationCode ?? undefined),
            { staleTime },
          );
          break;
        default:
          break;
      }
    },
    [dataCache, translationCode, translationKey]
  );

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "reader", icon: BookOpen, label: "Reader" },
    { id: "pre-read", icon: Book, label: "Pre-Read" },
    { id: "highlights", icon: Heart, label: "Highlights" },
    { id: "memory", icon: Brain, label: "Memory" },
    { id: "notes", icon: FileText, label: "Notes" },
  ];

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
                  {item.icon && (
                    <item.icon className={styles.navIcon} aria-hidden="true" />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={styles.activeIndicator}
                      initial={false}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
