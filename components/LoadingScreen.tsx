"use client";

import type { ReactNode } from "react";
import Image from "next/image";

import styles from "./LoadingScreen.module.css";
import { cn } from "./ui/utils";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
  variant?: "page" | "section";
}

export function LoadingScreen({
  title = "Preparing your study space…",
  subtitle = "Please wait while we gather everything you need.",
  icon,
  className,
  variant = "page",
}: LoadingScreenProps) {
  const containerClassName = cn(
    styles.container,
    variant === "page" ? styles.containerPage : styles.containerSection,
    className,
  );

  const shellClassName = cn(styles.shell, variant === "section" && styles.shellSection);

  return (
    <div className={containerClassName}>
      <div className={shellClassName}>
        <div className={styles.glow} />
        <div className={styles.iconWrap}>
          {icon ?? (
            <Image
              src="/sword_logo.png"
              alt="SWORD logo"
              width={56}
              height={56}
              className={styles.icon}
              priority
            />
          )}
        </div>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
