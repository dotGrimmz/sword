"use client";

import type { ReactNode } from "react";
import Image from "next/image";

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
