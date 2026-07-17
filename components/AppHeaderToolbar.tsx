"use client";

import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/lib/api/profile";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TranslationSwitcher } from "@/components/TranslationSwitcher";
import { getRouteForScreen } from "@/components/app-navigation";
import { cn } from "@/components/ui/utils";

import styles from "./AppHeaderToolbar.module.css";

type AppHeaderToolbarProps = {
  className?: string;
  /** Hide avatar on Profile itself. */
  showProfile?: boolean;
  onNavigateProfile?: () => void;
};

export function AppHeaderToolbar({
  className,
  showProfile = true,
  onNavigateProfile,
}: AppHeaderToolbarProps) {
  const router = useRouter();
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: getProfile,
    staleTime: STALE_TIMES.profile,
    enabled: showProfile,
  });
  const avatarUrl = profileQuery.data?.avatar_url?.trim() || null;

  const handleProfile = () => {
    if (onNavigateProfile) {
      onNavigateProfile();
      return;
    }
    router.push(getRouteForScreen("settings"));
  };

  return (
    <div className={cn(styles.toolbar, className)}>
      <TranslationSwitcher
        className={styles.translation}
        selectClassName={styles.trigger}
        hideLabel
        showCodeOnly
        size="compact"
      />
      {showProfile ? (
        <button
          type="button"
          className={styles.profileButton}
          aria-label="Profile"
          title="Profile"
          onClick={handleProfile}
        >
          <Avatar className={styles.profileAvatar}>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className={styles.profileAvatarFallback}>
              <User className={styles.profileIcon} aria-hidden="true" />
            </AvatarFallback>
          </Avatar>
        </button>
      ) : null}
    </div>
  );
}
