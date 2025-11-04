"use client";

import { useCallback } from "react";
import { Button } from "./ui/button";
import { Home, BookOpen, Heart, Brain, FileText } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

import { cn } from "./ui/utils";
import styles from "./BottomNavigation.module.css";
import { useDataCacheContext } from "@/lib/data-cache/DataCacheProvider";
import { getUserNotes } from "@/lib/api/notes";
import { getUserHighlights } from "@/lib/api/highlights";
import { getUserMemoryVerses } from "@/lib/api/memory";

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  const dataCache = useDataCacheContext();

  const prefetchScreen = useCallback(
    (screen: string) => {
      const staleTime = 1000 * 60 * 5;
      switch (screen) {
        case "home":
          void dataCache.fetch("user-notes-preview", () => getUserNotes(10), { staleTime });
          void dataCache.fetch("user-highlights", getUserHighlights, { staleTime });
          void dataCache.fetch("user-memory-verses", getUserMemoryVerses, { staleTime });
          break;
        case "notes":
          void dataCache.fetch("user-notes", getUserNotes, { staleTime });
          break;
        case "highlights":
          void dataCache.fetch("user-highlights", getUserHighlights, { staleTime });
          break;
        case "memory":
          void dataCache.fetch("user-memory-verses", getUserMemoryVerses, { staleTime });
          break;
        default:
          break;
      }
    },
    [dataCache]
  );

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "reader", icon: BookOpen, label: "Read" },
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
              >
                <div className={styles.iconWrapper}>
                  {item.icon ? (
                    <item.icon className={styles.navIcon} aria-hidden="true" />
                  ) : (
                    <Image
                      src="/sword_logo.png"
                      alt="Apologetics"
                      width={20}
                      height={20}
                      className={cn(styles.navIcon, styles.navIconLogo)}
                    />
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
                <span className={styles.navLabel}>{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
