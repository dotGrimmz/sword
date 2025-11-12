"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

export type UserRole = "user" | "host" | "admin";

interface ProfileContextValue {
  role: UserRole;
  setRole: Dispatch<SetStateAction<UserRole>>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);

interface ProfileProviderProps {
  children: ReactNode;
  initialRole?: UserRole | null;
}

export function ProfileProvider({
  children,
  initialRole,
}: ProfileProviderProps) {
  const [role, setRole] = useState<UserRole>(
    initialRole ?? "user",
  );

  const value = useMemo(() => ({ role, setRole }), [role]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
