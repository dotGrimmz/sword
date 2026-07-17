import { BookOpen, FileText, Heart, LayoutDashboard } from "lucide-react";

import styles from "@/components/BottomNavigation.module.css";

const navItems = [
  { id: "home", icon: LayoutDashboard, label: "Today", active: true },
  { id: "reader", icon: BookOpen, label: "Scripture", active: false },
  { id: "notes", icon: FileText, label: "Reflections", active: false },
  { id: "highlights", icon: Heart, label: "Favorites", active: false },
] as const;

export function StitchCaptureBottomNav({
  activeId = "home",
}: {
  activeId?: (typeof navItems)[number]["id"];
}) {
  return (
    <div className={styles.container}>
      <div className={styles.shell}>
        <div className={styles.menu}>
          {navItems.map((item) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                className={`${styles.navButton} ${isActive ? styles.navButtonActive : ""}`}
                aria-label={item.label}
              >
                <div className={styles.iconWrapper}>
                  <item.icon className={styles.navIcon} aria-hidden="true" />
                  {isActive ? <div className={styles.activeIndicator} /> : null}
                </div>
                <span className={styles.navLabel}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
