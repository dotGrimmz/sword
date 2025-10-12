"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps = {}) {
  void onNavigate;
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        toast.error(error.message);
        setAuthUser(null);
        setIsLoadingProfile(false);
        return;
      }
      const user = data.user ?? null;
      setAuthUser(user);

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("theme")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error(profileError);
        } else if (profile?.theme) {
          setTheme(profile.theme as Theme);
        }
      }

      setIsLoadingProfile(false);
    };

    void loadProfile();
  }, [supabase, setTheme]);

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

  const displayName =
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email ??
    "Your profile";
  const avatarUrl =
    (authUser?.user_metadata?.avatar_url as string | undefined) ??
    (authUser?.user_metadata?.picture as string | undefined) ??
    null;
  const email = authUser?.email ?? "No email on file";

  const formatDateLabel = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const memberSince = formatDateLabel(authUser?.created_at);
  const lastSignIn = formatDateLabel(authUser?.last_sign_in_at);

  const handleThemeChange = async (nextTheme: Theme) => {
    if (nextTheme === theme) {
      return;
    }

    const previousTheme = theme;
    setTheme(nextTheme);

    if (!authUser) {
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ theme: nextTheme })
      .eq("id", authUser.id);

    if (error) {
      setTheme(previousTheme);
      toast.error(error.message ?? "Unable to update theme");
      return;
    }

    toast.success("Theme updated");
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <motion.div
          className={styles.headerRow}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className={`${styles.avatarWrap} ${styles.heroPulse}`}>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${displayName} avatar`}
                width={56}
                height={56}
                className={styles.avatarImage}
                unoptimized
              />
            ) : (
              <div className={styles.avatarFallback}>
                <User aria-hidden="true" />
              </div>
            )}
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.headerTitle}>Settings</h1>
            <p className={styles.headerSubtitle}>
              {isLoadingProfile ? "Loading profile…" : `Signed in as ${email}`}
            </p>
          </div>
        </motion.div>
      </div>

      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.02 }}
        >
          <Card className={styles.profileCard}>
            <CardHeader className={styles.sectionHeader}>
              <CardTitle className={styles.sectionTitle}>
                <User className={styles.sectionIcon} aria-hidden="true" />
                <span>Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.sectionContent}>
              <p className={styles.sectionDescription}>
                Review the information attached to your account.
              </p>
              <ul className={styles.profileMetaList}>
                <li className={styles.profileMetaItem}>
                  <span className={styles.metaLabel}>Name</span>
                  <span className={styles.metaValue}>
                    {isLoadingProfile ? "…" : displayName}
                  </span>
                </li>
                <li className={styles.profileMetaItem}>
                  <span className={styles.metaLabel}>Email</span>
                  <span className={styles.metaValue}>
                    {isLoadingProfile ? "…" : email}
                  </span>
                </li>
                <li className={styles.profileMetaItem}>
                  <span className={styles.metaLabel}>Member Since</span>
                  <span className={styles.metaValue}>
                    {isLoadingProfile ? "…" : memberSince}
                  </span>
                </li>
                <li className={styles.profileMetaItem}>
                  <span className={styles.metaLabel}>Last Sign In</span>
                  <span className={styles.metaValue}>
                    {isLoadingProfile ? "…" : lastSignIn}
                  </span>
                </li>
                <li className={styles.profileMetaItem}>
                  <span className={styles.metaLabel}>Current Palette</span>
                  <span className={styles.metaValue}>{themeName}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.15 }}
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
                    onClick={() => {
                      void handleThemeChange(themeOption.value);
                    }}
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
