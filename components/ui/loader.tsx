"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";

import styles from "./Loader.module.css";

interface LoaderProps {
  label?: string;
  className?: string;
  iconClassName?: string;
}

export function Loader({ label = "Loading…", className, iconClassName }: LoaderProps) {
  return (
    <span className={clsx(styles.loader, className)}>
      <Loader2 className={clsx(styles.icon, iconClassName)} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
