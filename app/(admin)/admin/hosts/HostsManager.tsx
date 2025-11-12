"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HostProfile } from "@/types/pre-read";

import managerStyles from "../AdminManager.module.css";
import styles from "./HostsManager.module.css";

type HostRow = {
  id: string;
  form: HostEditable;
  original: HostEditable;
  role: HostProfile["role"];
  isSaving: boolean;
};

type HostEditable = {
  username: string;
  avatar_url: string;
  stream_tagline: string;
  stream_url: string;
  is_host_active: boolean;
};

const normalizeHost = (host: HostProfile): HostRow => ({
  id: host.id,
  role: host.role,
  isSaving: false,
  form: {
    username: host.username ?? "",
    avatar_url: host.avatar_url ?? "",
    stream_tagline: host.stream_tagline ?? "",
    stream_url: host.stream_url ?? "",
    is_host_active: Boolean(host.is_host_active),
  },
  original: {
    username: host.username ?? "",
    avatar_url: host.avatar_url ?? "",
    stream_tagline: host.stream_tagline ?? "",
    stream_url: host.stream_url ?? "",
    is_host_active: Boolean(host.is_host_active),
  },
});

const hasChanges = (row: HostRow) =>
  row.form.username !== row.original.username ||
  row.form.avatar_url !== row.original.avatar_url ||
  row.form.stream_tagline !== row.original.stream_tagline ||
  row.form.stream_url !== row.original.stream_url ||
  row.form.is_host_active !== row.original.is_host_active;

const initialFallback = (name: string) => {
  if (!name) return "H";
  const [first, second] = name.split(" ");
  if (second) {
    return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

interface HostsManagerProps {
  initialHosts: HostProfile[];
}

export default function HostsManager({ initialHosts }: HostsManagerProps) {
  const [hosts, setHosts] = useState(() =>
    initialHosts.map((host) => normalizeHost(host)),
  );

  const handleFieldChange = useCallback(
    (id: string, field: keyof HostEditable, value: string) => {
      setHosts((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, form: { ...row.form, [field]: value } }
            : row,
        ),
      );
    },
    [],
  );

  const handleToggleActive = useCallback((id: string, nextValue: boolean) => {
    setHosts((prev) =>
      prev.map((row) =>
        row.id === id
          ? { ...row, form: { ...row.form, is_host_active: nextValue } }
          : row,
      ),
    );
  }, []);

  const handleReset = useCallback((id: string) => {
    setHosts((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, form: { ...row.original } } : row,
      ),
    );
  }, []);

  const handleSave = useCallback(
    async (id: string) => {
      setHosts((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, isSaving: true } : row,
        ),
      );

      const row = hosts.find((host) => host.id === id);
      if (!row) {
        toast.error("Host not found in local state.");
        setHosts((prev) =>
          prev.map((current) =>
            current.id === id ? { ...current, isSaving: false } : current,
          ),
        );
        return;
      }

      const payload = {
        username: row.form.username.trim() || null,
        avatar_url: row.form.avatar_url.trim() || null,
        stream_tagline: row.form.stream_tagline.trim() || null,
        stream_url: row.form.stream_url.trim() || null,
        is_host_active: row.form.is_host_active,
      };

      try {
        const response = await fetch(`/api/hosts/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let message = "Unable to update host.";
          try {
            const errorBody = (await response.json()) as { error?: string };
            if (errorBody?.error) {
              message = errorBody.error;
            }
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const updated = (await response.json()) as HostProfile;
        setHosts((prev) =>
          prev.map((current) =>
            current.id === id
              ? normalizeHost(updated)
              : current,
          ),
        );
        toast.success("Host updated.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unexpected error updating host.",
        );
        setHosts((prev) =>
          prev.map((current) =>
            current.id === id ? { ...current, isSaving: false } : current,
          ),
        );
      }
    },
    [hosts],
  );

  if (hosts.length === 0) {
    return (
      <div className={managerStyles.managerContainer}>
        <div className={styles.emptyState}>
          No host profiles found. Assign role=&quot;host&quot; via Supabase to
          manage metadata here.
        </div>
      </div>
    );
  }

  return (
    <div className={managerStyles.managerContainer}>
      <div className={managerStyles.managerHeader}>
        <div className={managerStyles.managerHeading}>
          <p className={managerStyles.managerMeta}>
            Profiles with role=&quot;host&quot;
          </p>
          <h2 className={managerStyles.managerTitle}>Host Directory</h2>
        </div>
      </div>
      <div className={styles.manager}>
        {hosts.map((host) => {
          const dirty = hasChanges(host);
          const badgeVariant =
            host.form.is_host_active && host.role === "host"
              ? "default"
              : "secondary";

          return (
            <div key={host.id} className={styles.hostRow}>
              <div className={styles.header}>
                <div className={styles.avatarGroup}>
                  <Avatar>
                    {host.form.avatar_url ? (
                      <AvatarImage src={host.form.avatar_url} alt={host.form.username} />
                    ) : null}
                    <AvatarFallback>
                      {initialFallback(host.form.username || "Host")}
                    </AvatarFallback>
                  </Avatar>
                  <div className={styles.avatarMeta}>
                    <span className={styles.avatarName}>
                      {host.form.username || "Unnamed Host"}
                    </span>
                    <Badge variant={badgeVariant}>
                      {host.form.is_host_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor={`active-${host.id}`}>Active host</Label>
                  <Switch
                    id={`active-${host.id}`}
                    checked={host.form.is_host_active}
                    onCheckedChange={(value) => handleToggleActive(host.id, value)}
                  />
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <Label className={styles.label}>Display Name</Label>
                  <Input
                    value={host.form.username}
                    onChange={(event) =>
                      handleFieldChange(host.id, "username", event.target.value)
                    }
                    placeholder="Stream Host"
                  />
                </div>
                <div className={styles.field}>
                  <Label className={styles.label}>Stream Tagline</Label>
                  <Input
                    value={host.form.stream_tagline}
                    onChange={(event) =>
                      handleFieldChange(host.id, "stream_tagline", event.target.value)
                    }
                    placeholder="Midweek Study Lead"
                  />
                </div>
                <div className={styles.field}>
                  <Label className={styles.label}>Stream URL</Label>
                  <Input
                    value={host.form.stream_url}
                    onChange={(event) =>
                      handleFieldChange(host.id, "stream_url", event.target.value)
                    }
                    placeholder="https://example.com/stream"
                  />
                </div>
                <div className={styles.field}>
                  <Label className={styles.label}>Avatar URL</Label>
                  <Input
                    value={host.form.avatar_url}
                    onChange={(event) =>
                      handleFieldChange(host.id, "avatar_url", event.target.value)
                    }
                    placeholder="https://images.example.com/avatar.png"
                  />
                </div>
              </div>

              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleReset(host.id)}
                  disabled={!dirty || host.isSaving}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSave(host.id)}
                  disabled={!dirty || host.isSaving}
                >
                  {host.isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
