"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  LayoutDashboard,
  QrCode,
  Users2,
} from "lucide-react";

import { ThemeProvider, type Theme } from "@/components/ThemeContext";
import { Toaster } from "@/components/ui/sonner";

import styles from "./AdminShell.module.css";

type AdminShellProps = {
  children: ReactNode;
  initialTheme?: Theme | null;
};

const navItems = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    match: (path: string) => path === "/admin",
  },
  {
    href: "/admin/pre-read",
    label: "Weekly Study",
    icon: CalendarDays,
    match: (path: string) => path.startsWith("/admin/pre-read"),
  },
  {
    href: "/admin/hosts",
    label: "Hosts",
    icon: Users2,
    match: (path: string) => path.startsWith("/admin/hosts"),
  },
  {
    href: "/admin/qr-login",
    label: "Login QR",
    icon: QrCode,
    match: (path: string) => path.startsWith("/admin/qr-login"),
  },
] as const;

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/pre-read")) return "Weekly Study";
  if (pathname.startsWith("/admin/hosts")) return "Hosts";
  if (pathname.startsWith("/admin/qr-login")) return "Login QR";
  if (pathname.startsWith("/admin/topics")) return "Topics";
  if (pathname.startsWith("/admin/paths")) return "Paths";
  if (pathname.startsWith("/admin/sources")) return "Sources";
  return "Overview";
}

export function AdminShell({ children, initialTheme }: AdminShellProps) {
  const pathname = usePathname() ?? "/admin";
  const title = pageTitle(pathname);

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <p className={styles.brandMark}>SWORD</p>
            <p className={styles.brandLabel}>Admin Console</p>
          </div>

          <nav className={styles.nav} aria-label="Admin">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? styles.navItemActive : styles.navItem}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={styles.navIcon} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className={styles.navSoon} aria-disabled="true">
              <span className={styles.navSoonLabel}>Users</span>
              <span className={styles.soonBadge}>Soon</span>
            </div>
          </nav>

          <Link href="/dashboard" className={styles.backToApp}>
            <ArrowLeft className={styles.backIcon} aria-hidden="true" />
            Back to app
          </Link>
        </aside>

        <div className={styles.main}>
          <header className={styles.topBar}>
            <h1 className={styles.topTitle}>{title}</h1>
            <p className={styles.topCredit}>Realign Ministries</p>
          </header>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}
