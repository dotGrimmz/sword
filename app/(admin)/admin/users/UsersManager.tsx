"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAdminUserTitle } from "@/lib/api/admin-users";
import type { AdminUserSummary } from "@/types/admin-users";
import type { UserRole } from "@/components/ProfileContext";

import managerStyles from "../AdminManager.module.css";
import styles from "./UsersManager.module.css";

type UserRow = {
  id: string;
  email: string | null;
  username: string | null;
  role: UserRole;
  avatar_url: string | null;
  title: string;
  originalTitle: string;
  isSaving: boolean;
};

type UsersManagerProps = {
  initialUsers: AdminUserSummary[];
};

const toRow = (user: AdminUserSummary): UserRow => ({
  id: user.id,
  email: user.email,
  username: user.username,
  role: user.role,
  avatar_url: user.avatar_url,
  title: user.title ?? "",
  originalTitle: user.title ?? "",
  isSaving: false,
});

const initials = (name: string | null, email: string | null) => {
  const source = (name ?? email ?? "?").trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
};

export default function UsersManager({ initialUsers }: UsersManagerProps) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState(() => initialUsers.map(toRow));

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.username ?? "",
        row.email ?? "",
        row.title,
        row.role,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows]);

  const handleTitleChange = useCallback((id: string, title: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, title } : row)),
    );
  }, []);

  const handleReset = useCallback((id: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, title: row.originalTitle } : row,
      ),
    );
  }, []);

  const handleSave = useCallback(
    async (id: string) => {
      const current = rows.find((row) => row.id === id);
      if (!current) return;

      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, isSaving: true } : row,
        ),
      );

      try {
        const nextTitle = current.title.trim() || null;
        const { user } = await updateAdminUserTitle(id, nextTitle);
        setRows((prev) =>
          prev.map((row) =>
            row.id === id
              ? {
                  ...row,
                  title: user.title ?? "",
                  originalTitle: user.title ?? "",
                  isSaving: false,
                }
              : row,
          ),
        );
        toast.success("Title updated");
      } catch (error) {
        setRows((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, isSaving: false } : row,
          ),
        );
        toast.error(
          error instanceof Error ? error.message : "Unable to update title",
        );
      }
    },
    [rows],
  );

  return (
    <div className={managerStyles.managerContainer}>
      <div className={managerStyles.managerHeader}>
        <div className={managerStyles.managerHeading}>
          <h3 className={managerStyles.managerTitle}>Directory</h3>
          <p className={managerStyles.managerMeta}>
            {filtered.length} of {rows.length} users
          </p>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, title…"
          className={`h-14 min-h-14 text-base md:h-11 md:min-h-11 ${styles.searchInput}`}
          aria-label="Search users"
        />
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No users match your search.</p>
      ) : (
        <div className={styles.list}>
          {filtered.map((row) => {
            const dirty = row.title !== row.originalTitle;
            const displayName = row.username?.trim() || row.email || "Member";
            return (
              <article key={row.id} className={styles.row}>
                <div className={styles.identity}>
                  {row.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatar_url}
                      alt=""
                      className={styles.avatar}
                    />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden="true">
                      {initials(row.username, row.email)}
                    </span>
                  )}
                  <div className={styles.copy}>
                    <p className={styles.name}>{displayName}</p>
                    <p className={styles.meta}>
                      {row.title.trim() || "No title"}
                    </p>
                    <span className={styles.roleBadge}>{row.role}</span>
                  </div>
                </div>

                <div className={styles.field}>
                  <span className={styles.label}>Email</span>
                  <p className={styles.value}>
                    {row.email ?? (
                      <span className={styles.muted}>Not available</span>
                    )}
                  </p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor={`title-${row.id}`}>
                    Title
                  </label>
                  <Input
                    id={`title-${row.id}`}
                    value={row.title}
                    onChange={(event) =>
                      handleTitleChange(row.id, event.target.value)
                    }
                    placeholder="e.g. Pastor, Elder, Deacon"
                    maxLength={80}
                  />
                </div>

                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!dirty || row.isSaving}
                    onClick={() => handleReset(row.id)}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    disabled={!dirty || row.isSaving}
                    onClick={() => void handleSave(row.id)}
                  >
                    {row.isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
