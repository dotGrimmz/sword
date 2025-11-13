"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User, Palette, Shield, LogOut, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useTheme, themeOptions, type Theme } from "./ThemeContext";
import { createClient } from "@/lib/supabase/client";
import { useProfile, type UserRole } from "@/components/ProfileContext";
import { clearCachedAccessToken } from "@/lib/api/session";
import styles from "./SettingsScreen.module.css";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type ProfileFormState = {
  displayName: string;
  avatarUrl: string;
  streamTagline: string;
  streamUrl: string;
};

type ProfileResponse = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  stream_tagline: string | null;
  stream_url: string | null;
  theme: Theme | (string & {}) | null;
  role: UserRole | (string & {});
};

const createEmptyProfileForm = (): ProfileFormState => ({
  displayName: "",
  avatarUrl: "",
  streamTagline: "",
  streamUrl: "",
});

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

interface SettingsScreenProps {
  onNavigate?: (screen: string) => void;
}

export function SettingsScreen({ onNavigate }: SettingsScreenProps = {}) {
  void onNavigate;
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { theme, setTheme } = useTheme();
  const { role, setRole } = useProfile();
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() =>
    createEmptyProfileForm()
  );
  const [initialProfileForm, setInitialProfileForm] =
    useState<ProfileFormState>(() => createEmptyProfileForm());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

      let resolvedProfileForm = createEmptyProfileForm();

      if (user) {
        const fallbackForm: ProfileFormState = {
          displayName:
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            user.email ??
            "",
          avatarUrl:
            (user.user_metadata?.avatar_url as string | undefined) ??
            (user.user_metadata?.picture as string | undefined) ??
            "",
          streamTagline: "",
          streamUrl: "",
        };

        try {
          const response = await fetch("/api/profile", { cache: "no-store" });
          if (response.ok) {
            const profile = (await response.json()) as ProfileResponse;
            if (profile.theme && typeof profile.theme === "string") {
              setTheme(profile.theme as Theme);
            }
            if (profile.role && typeof profile.role === "string") {
              setRole(profile.role as UserRole);
            }
            resolvedProfileForm = {
              displayName: profile.username ?? fallbackForm.displayName,
              avatarUrl: profile.avatar_url ?? fallbackForm.avatarUrl,
              streamTagline: profile.stream_tagline ?? "",
              streamUrl: profile.stream_url ?? "",
            };
          } else if (response.status === 404) {
            resolvedProfileForm = fallbackForm;
          } else {
            let message = "Unable to load profile.";
            try {
              const payload = (await response.json()) as { error?: string };
              if (payload?.error) {
                message = payload.error;
              }
            } catch {
              // ignore
            }
            console.error(message);
            resolvedProfileForm = fallbackForm;
          }
        } catch (profileError) {
          console.error("Failed to load profile preferences", profileError);
          resolvedProfileForm = fallbackForm;
        }
      }

      setProfileForm(resolvedProfileForm);
      setInitialProfileForm(resolvedProfileForm);
      setProfileLoaded(true);
      setIsLoadingProfile(false);
    };

    void loadProfile();
  }, [supabase, setTheme, setRole]);

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

  const fallbackDisplayName =
    (authUser?.user_metadata?.full_name as string | undefined) ??
    (authUser?.user_metadata?.name as string | undefined) ??
    authUser?.email ??
    "Your profile";
  const fallbackAvatarUrl =
    (authUser?.user_metadata?.avatar_url as string | undefined) ??
    (authUser?.user_metadata?.picture as string | undefined) ??
    null;
  const profileDisplayName =
    profileForm.displayName.trim() || fallbackDisplayName;
  const profileAvatarUrl = profileForm.avatarUrl.trim() || fallbackAvatarUrl;
  const hasStoredAvatar = profileForm.avatarUrl.trim().length > 0;
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
  const isHostRole = role === "host" || role === "admin";

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

  const handleProfileInputChange = (
    field: keyof ProfileFormState,
    value: string
  ) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const hasProfileChanges =
    profileForm.displayName !== initialProfileForm.displayName ||
    profileForm.streamTagline !== initialProfileForm.streamTagline ||
    profileForm.streamUrl !== initialProfileForm.streamUrl;

  const handleSaveProfile = async () => {
    if (!profileLoaded || !hasProfileChanges) {
      return;
    }

    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profileForm.displayName.trim(),
          streamTagline: profileForm.streamTagline.trim(),
          streamUrl: profileForm.streamUrl.trim(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | ProfileResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? (payload as { error?: string }).error ?? "Unable to update profile."
            : "Unable to update profile.";
        throw new Error(message);
      }

      if (!payload || typeof payload !== "object") {
        throw new Error("Unexpected response while updating profile.");
      }

      const profile = payload as ProfileResponse;

      const normalizedForm: ProfileFormState = {
        displayName: profile.username ?? "",
        avatarUrl: profile.avatar_url ?? "",
        streamTagline: profile.stream_tagline ?? "",
        streamUrl: profile.stream_url ?? "",
      };

      if (profile.theme && typeof profile.theme === "string") {
        setTheme(profile.theme as Theme);
      }
      if (profile.role && typeof profile.role === "string") {
        setRole(profile.role as UserRole);
      }

      setProfileForm(normalizedForm);
      setInitialProfileForm({
        displayName: normalizedForm.displayName,
        avatarUrl: normalizedForm.avatarUrl,
        streamTagline: normalizedForm.streamTagline,
        streamUrl: normalizedForm.streamUrl,
      });
      toast.success("Profile updated");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update profile settings.";
      toast.error(message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUploadClick = () => {
    if (isUploadingAvatar) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Profile photos must be 5 MB or less.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | { avatar_url?: string; error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? (payload as { error?: string }).error ??
              "Unable to upload photo."
            : "Unable to upload photo.";
        throw new Error(message);
      }

      const nextUrl = payload?.avatar_url ?? "";
      setProfileForm((prev) => ({ ...prev, avatarUrl: nextUrl }));
      setInitialProfileForm((prev) => ({ ...prev, avatarUrl: nextUrl }));
      toast.success("Photo updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to upload photo.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (isUploadingAvatar) {
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { avatar_url?: string; error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? (payload as { error?: string }).error ??
              "Unable to remove photo."
            : "Unable to remove photo.";
        throw new Error(message);
      }

      setProfileForm((prev) => ({ ...prev, avatarUrl: "" }));
      setInitialProfileForm((prev) => ({ ...prev, avatarUrl: "" }));
      toast.success("Photo removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove photo.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
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
            {profileAvatarUrl ? (
              <img
                src={profileAvatarUrl}
                alt={`${profileDisplayName} avatar`}
                width={56}
                height={56}
                className={styles.avatarImage}
                loading="lazy"
                referrerPolicy="no-referrer"
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
                    {isLoadingProfile ? "…" : profileDisplayName}
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
          transition={{ duration: 0.32, delay: 0.1 }}
        >
          <Card className={styles.sectionCard}>
            <CardHeader className={styles.sectionHeader}>
              <CardTitle className={styles.sectionTitle}>
                <User className={styles.sectionIcon} aria-hidden="true" />
                <span>Profile Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className={styles.sectionContent}>
              <p className={styles.sectionDescription}>
                Control what others see next to your comments and live host
                card.
              </p>
              <div className={styles.formGrid}>
                <div className={`${styles.formField} ${styles.formFieldFull}`}>
                  <Label
                    htmlFor="profile_avatar_upload"
                    className={styles.formLabel}
                  >
                    Profile photo
                  </Label>
                  <div className={styles.avatarField}>
                    <div className={styles.avatarFieldPreview}>
                      {profileAvatarUrl ? (
                        <img
                          src={profileAvatarUrl}
                          alt={`${profileDisplayName} avatar`}
                          className={styles.avatarFieldImage}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className={`${styles.avatarFieldImage} ${styles.avatarFieldFallback}`}
                        >
                          <User aria-hidden="true" />
                        </div>
                      )}
                      <div className={styles.avatarFieldActions}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAvatarUploadClick}
                          disabled={isUploadingAvatar}
                        >
                          {isUploadingAvatar ? "Uploading..." : "Upload photo"}
                        </Button>
                        {hasStoredAvatar ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAvatarDelete}
                            disabled={isUploadingAvatar}
                          >
                            Remove photo
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <p className={styles.formHelper}>
                      PNG, JPG, GIF, or WebP up to 5 MB.
                    </p>
                    <input
                      ref={fileInputRef}
                      id="profile_avatar_upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className={styles.srOnly}
                      onChange={handleAvatarFileChange}
                    />
                  </div>
                </div>
                <div className={styles.formField}>
                  <Label
                    htmlFor="profile_display_name"
                    className={styles.formLabel}
                  >
                    Display name
                  </Label>
                  <Input
                    id="profile_display_name"
                    className={styles.formControl}
                    placeholder="e.g. Jane Doe"
                    value={profileForm.displayName}
                    onChange={(event) =>
                      handleProfileInputChange(
                        "displayName",
                        event.target.value
                      )
                    }
                    disabled={isSavingProfile}
                  />
                  <p className={styles.formHelper}>
                    Visible beside your comments and host summary.
                  </p>
                </div>
                {isHostRole ? (
                  <>
                    <div className={styles.formField}>
                      <Label
                        htmlFor="profile_stream_tagline"
                        className={styles.formLabel}
                      >
                        Stream tagline
                      </Label>
                      <Input
                        id="profile_stream_tagline"
                        className={styles.formControl}
                        placeholder="Short teaser for your stream"
                        value={profileForm.streamTagline}
                        onChange={(event) =>
                          handleProfileInputChange(
                            "streamTagline",
                            event.target.value
                          )
                        }
                        disabled={isSavingProfile}
                      />
                      <p className={styles.formHelper}>
                        Appears under your name on the live host panel.
                      </p>
                    </div>
                    <div className={styles.formField}>
                      <Label
                        htmlFor="profile_stream_url"
                        className={styles.formLabel}
                      >
                        Stream URL
                      </Label>
                      <Input
                        id="profile_stream_url"
                        className={styles.formControl}
                        placeholder="https://youtube.com/@yoursession"
                        value={profileForm.streamUrl}
                        onChange={(event) =>
                          handleProfileInputChange(
                            "streamUrl",
                            event.target.value
                          )
                        }
                        disabled={isSavingProfile}
                      />
                      <p className={styles.formHelper}>
                        Members tap this link to join your broadcast.
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
              <div className={styles.formActions}>
                <Button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={
                    isSavingProfile || !profileLoaded || !hasProfileChanges
                  }
                >
                  {isSavingProfile ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.2 }}
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
                      theme === themeOption.value
                        ? styles.themeOptionCardSelected
                        : ""
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
                      <div className={styles.themeOptionName}>
                        {themeOption.name}
                      </div>
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
