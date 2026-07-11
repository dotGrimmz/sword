"use client";

import type { ReactNode } from "react";

import { StitchCaptureBottomNav } from "@/components/stitch-capture/StitchCaptureBottomNav";
import styles from "@/components/AppShell.module.css";

type StitchCaptureShellProps = {
  currentScreen: string;
  children: ReactNode;
};

export function StitchCaptureShell({ currentScreen, children }: StitchCaptureShellProps) {
  return (
    <div
      className={styles.container}
      style={{ "--bottom-nav-height": "104px" } as React.CSSProperties}
    >
      <div className={styles.surface}>
        <div className={styles.surfaceInner}>
          <div className={styles.frame}>
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </div>
      <StitchCaptureBottomNav
        activeId={
          currentScreen === "reader" ||
          currentScreen === "notes" ||
          currentScreen === "highlights"
            ? currentScreen
            : "home"
        }
      />
    </div>
  );
}
