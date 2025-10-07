"use client";

import type { ReactNode } from "react";
import { Sword } from "lucide-react";

import styles from "./LoadingScreen.module.css";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

export function LoadingScreen({
  title = "Preparing your study space…",
  subtitle = "Please wait while we gather everything you need.",
  icon,
  className,
}: LoadingScreenProps) {
  return (
    <div className={`${styles.container} ${className ?? ""}`.trim()}>
      <div className={styles.shell}>
        <div className={styles.glow} />
        <div className={styles.iconWrap}>
          {icon ?? <Sword className={styles.icon} aria-hidden="true" />}
        </div>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
    </div>
  );
}
