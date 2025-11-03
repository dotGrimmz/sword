"use client";

import { Button } from "./ui/button";
import { Home, BookOpen, Heart, Brain, FileText } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";

import { cn } from "./ui/utils";
import styles from "./BottomNavigation.module.css";

interface BottomNavigationProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
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
                size="sm"
                onClick={() => onNavigate(item.id)}
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
