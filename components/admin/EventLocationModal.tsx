"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import {
  createAdminEventLocation,
  deleteAdminEventLocation,
  updateAdminEventLocation,
} from "@/lib/api/events";
import type { EventLocation } from "@/types/events";

import styles from "./EventLocationModal.module.css";

type EventLocationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: EventLocation | null;
  onSaved: (location: EventLocation) => void;
  onDeleted?: (id: string) => void;
};

export default function EventLocationModal({
  open,
  onOpenChange,
  location,
  onSaved,
  onDeleted,
}: EventLocationModalProps) {
  const editing = Boolean(location);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(location?.name ?? "");
    setAddress(location?.address ?? "");
    setNotes(location?.notes ?? "");
    setSaving(false);
    setDeleting(false);
  }, [open, location]);

  const busy = saving || deleting;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }
    if (!trimmedAddress) {
      toast.error("Address is required");
      return;
    }

    setSaving(true);
    const payload = {
      name: trimmedName,
      address: trimmedAddress,
      notes: notes.trim() || null,
    };

    try {
      const { location: saved } = location
        ? await updateAdminEventLocation(location.id, payload)
        : await createAdminEventLocation(payload);
      toast.success(location ? "Location updated" : "Location saved");
      onSaved(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save location",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!location) return;
    const confirmed = window.confirm(
      `Delete “${location.name}”? Events using it will keep their current venue and address.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteAdminEventLocation(location.id);
      toast.success("Location deleted");
      onDeleted?.(location.id);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete location",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md" className={styles.content}>
        <ModalHeader>
          <ModalTitle>{editing ? "Edit location" : "Add location"}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <form id="event-location-form" className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="location-name">
                Name
              </label>
              <Input
                id="location-name"
                className={styles.control}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Community Park"
                required
                disabled={busy}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="location-address">
                Address
              </label>
              <Input
                id="location-address"
                className={styles.control}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                required
                disabled={busy}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="location-notes">
                Notes
              </label>
              <textarea
                id="location-notes"
                className={styles.control}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Parking, entrance, host notes…"
                disabled={busy}
                rows={3}
              />
            </div>
          </form>
        </ModalBody>
        <ModalFooter direction="row" className={styles.footer}>
          {editing ? (
            <Button
              type="button"
              variant="outline"
              className={styles.danger}
              onClick={handleDelete}
              disabled={busy}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          ) : (
            <span />
          )}
          <div className={styles.footerActions}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="event-location-form"
              disabled={busy}
              className={styles.primary}
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Save location"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
