"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { User, Palette, Shield, LogOut, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useTheme, themeOptions, type Theme } from "./ThemeContext";
import { createClient } from "@/lib/supabase/client";
import { clearCachedAccessToken } from "@/lib/api/session";
import styles from "./SettingsScreen.module.css";

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps = {}) {
  void onNavigate;
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();

  const themePreviewClassMap: Record<Theme, string> = {
    ocean: styles.themePreviewOcean,
    sunset: styles.themePreviewSunset,
    forest: styles.themePreviewForest,
    purple: styles.themePreviewPurple,
    cherry: styles.themePreviewCherry,
  };

  const themeName = useMemo(() => {
    const current = themeOptions.find((entry) => entry.value === theme);
    return current?.name ?? "Ocean Depths";
  }, [theme]);

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <motion.div
          className={styles.headerRow}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <span className={`${styles.headerIcon} ${styles.heroPulse}`}>
            <User aria-hidden="true" />
          </span>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Settings</h1>
            <p className={styles.headerSubtitle}>Current palette: {themeName}</p>
          </div>
        </motion.div>
      </div>

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.05 }}
        >
          <Card className={styles.sectionCard}>
            <CardHeader className={styles.sectionHeader}>
              <CardTitle className={styles.sectionTitle}>
                <Palette className={styles.sectionIcon} aria-hidden="true" />
                <span>Appearance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.sectionContent}>
              <p className={styles.sectionDescription}>
                Choose a theme that feels right for today&apos;s study session.
              </p>
              <div className={styles.themeOptions}>
                {themeOptions.map((themeOption) => (
                  <motion.div
                    key={themeOption.value}
                    className={`${styles.themeOptionCard} ${
                      theme === themeOption.value ? styles.themeOptionCardSelected : ""
                    }`}
                    onClick={() => setTheme(themeOption.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className={`${styles.themePreview} ${styles.heroPulse} ${
                        themePreviewClassMap[themeOption.value]
                      }`}
                      aria-hidden="true"
                    />
                    <div className={styles.themeOptionCopy}>
                      <div className={styles.themeOptionName}>{themeOption.name}</div>
                      <div className={styles.themeOptionDescription}>
                        {themeOption.description}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.35 }}
        >
          <Card className={styles.accountCard}>
            <CardHeader className={styles.sectionHeader}>
              <CardTitle className={styles.sectionTitle}>
                <Shield className={styles.sectionIcon} aria-hidden="true" />
                <span>Account &amp; Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.sectionContent}>
              <Button
                variant="outline"
                className={`${styles.accountButton} ${styles.accountButtonDanger}`}
                onClick={async () => {
                  if (isSigningOut) {
                    return;
                  }

                  setIsSigningOut(true);
                  const supabase = createClient();

                  try {
                    const { error } = await supabase.auth.signOut();

                    if (error) {
                      throw error;
                    }

                    clearCachedAccessToken();
                    toast.success("Signed out");
                    router.replace("/login");
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Unable to sign out";
                    toast.error(message);
                  } finally {
                    setIsSigningOut(false);
                  }
                }}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <Loader2 className={styles.heroPulse} aria-hidden="true" />
                ) : (
                  <LogOut aria-hidden="true" />
                )}
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.45 }}
        >
          <Card className={styles.appInfoCard}>
            <CardContent className={styles.appInfoContent}>
              <div className={styles.appInfoIcon} aria-hidden="true">
                <Image
                  src="/sword_logo.png"
                  alt="SWORD logo"
                  width={44}
                  height={44}
                  className={styles.appInfoLogo}
                  priority
                />
              </div>
              <h3 className={styles.appInfoTitle}>SWORD</h3>
              <p className={styles.appInfoSubtitle}>
                Scripture • Wisdom • Order • Reflection • Devotion
              </p>
              <p className={styles.appInfoVersion}>Version 1.0.0</p>
              <div className={styles.appInfoLinks}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={styles.appInfoLink}
                  onClick={() => router.push("/privacy")}
                >
                  Privacy Policy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={styles.appInfoLink}
                  onClick={() => router.push("/terms")}
                >
                  Terms of Service
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
