"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { BookOpenCheck, Pencil, PlusIcon, Trash2 } from "lucide-react";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";

import styles from "../AdminManager.module.css";

type AdminSource = {
  id: string;
  type: string;
  author: string;
  work: string;
  year_or_era: string;
  location: string;
  url: string;
  notes: string;
  updated_at: string | null;
};

interface SourcesManagerProps {
  initialSources: AdminSource[];
}

type SourceFormState = {
  id: string;
  type: string;
  author: string;
  work: string;
  year_or_era: string;
  location: string;
  url: string;
  notes: string;
};

const defaultFormState: SourceFormState = {
  id: "",
  type: "",
  author: "",
  work: "",
  year_or_era: "",
  location: "",
  url: "",
  notes: "",
};

export default function SourcesManager({
  initialSources,
}: SourcesManagerProps) {
  const [sources, setSources] = useState<AdminSource[]>(initialSources);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<SourceFormState>(defaultFormState);

  const sortedSources = useMemo(
    () =>
      [...sources].sort((a, b) =>
        a.work.localeCompare(b.work, undefined, { sensitivity: "base" }),
      ),
    [sources],
  );

  const openCreate = () => {
    setEditingSourceId(null);
    setFormState(defaultFormState);
    setIsModalOpen(true);
  };

  const openEdit = (source: AdminSource) => {
    setEditingSourceId(source.id);
    setFormState({
      id: source.id,
      type: source.type,
      author: source.author,
      work: source.work,
      year_or_era: source.year_or_era,
      location: source.location,
      url: source.url,
      notes: source.notes,
    });
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setIsSaving(false);
    setEditingSourceId(null);
    setFormState(defaultFormState);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      type: formState.type.trim() || null,
      author: formState.author.trim() || null,
      work: formState.work.trim(),
      year_or_era: formState.year_or_era.trim() || null,
      location: formState.location.trim() || null,
      url: formState.url.trim() || null,
      notes: formState.notes.trim() || null,
    };

    if (!payload.work) {
      toast.error("Work title is required.");
      setIsSaving(false);
      return;
    }

    if (!editingSourceId && !formState.id.trim()) {
      toast.error("An identifier is required for new sources.");
      setIsSaving(false);
      return;
    }

    const endpoint = editingSourceId
      ? `/api/sources/${editingSourceId}`
      : "/api/sources";
    const method = editingSourceId ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingSourceId
            ? payload
            : { id: formState.id.trim(), ...payload },
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to save source");
      }

      const mapped: AdminSource = {
        id: data.id,
        type: data.type ?? "",
        author: data.author ?? "",
        work: data.work ?? "",
        year_or_era: data.year_or_era ?? "",
        location: data.location ?? "",
        url: data.url ?? "",
        notes: data.notes ?? "",
        updated_at: data.updated_at ?? null,
      };

      setSources((prev) => {
        if (editingSourceId) {
          return prev.map((source) =>
            source.id === editingSourceId ? mapped : source,
          );
        }
        return [mapped, ...prev];
      });

      toast.success(
        editingSourceId ? "Source updated successfully." : "Source created.",
      );
      resetModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save source";
      toast.error(message);
      setIsSaving(false);
    }
  };

  const handleDelete = async (source: AdminSource) => {
    const confirmed = window.confirm(
      `Delete the source “${source.work}” by ${source.author || "Unknown"}?`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/sources/${source.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to delete source");
      }

      setSources((prev) => prev.filter((entry) => entry.id !== source.id));
      toast.success("Source deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete source";
      toast.error(message);
    }
  };

  return (
    <>
      <div className={styles.managerContainer}>
        <div className={styles.managerHeader}>
          <div className={styles.managerHeading}>
            <h2 className={styles.managerTitle}>Reference Library</h2>
            <p className={styles.managerMeta}>
              {sources.length} source{sources.length === 1 ? "" : "s"} curated
              for apologetics content.
            </p>
          </div>
          <div className={styles.actions}>
            <Button onClick={openCreate} className={styles.addButton}>
              <PlusIcon size={16} aria-hidden="true" />
              New Source
            </Button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>Work</th>
                <th className={styles.tableHeadCell}>Author</th>
                <th className={styles.tableHeadCell}>Type</th>
                <th className={styles.tableHeadCell}>Year / Era</th>
                <th className={styles.tableHeadCell}>Location</th>
                <th className={cn(styles.tableHeadCell, styles.alignRight)}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSources.map((source) => (
                <tr key={source.id} className={styles.tableRow}>
                  <td className={styles.tableCell} data-label="Work">
                    <div>
                      <p className={styles.sourceWork}>
                        <BookOpenCheck
                          className={styles.sourceIcon}
                          aria-hidden="true"
                        />
                        {source.work || "Untitled work"}
                      </p>
                      {source.notes ? (
                        <p className={styles.summary}>{source.notes}</p>
                      ) : null}
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.sourceLink}
                        >
                          {source.url}
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className={styles.tableCell} data-label="Author">
                    {source.author || "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Type">
                    {source.type || "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Year / Era">
                    {source.year_or_era || "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Location">
                    {source.location || "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Actions">
                    <div className={styles.buttonGroup}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(source)}
                        className={styles.iconButton}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source)}
                        className={cn(styles.iconButton, styles.danger)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedSources.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState} data-label="">
                    No sources have been added yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent size="lg" className={styles.modalContent}>
          <ModalHeader className={styles.modalHeader}>
            <ModalTitle className={styles.modalTitle}>
              {editingSourceId ? "Edit Source" : "Create Source"}
            </ModalTitle>
            <p className={styles.managerMeta}>
              Provide bibliographic details. All fields are optional except the
              work title and identifier.
            </p>
          </ModalHeader>
          <ModalBody className={styles.modalBody}>
            <form
              id="source-form"
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <div className={styles.field}>
                <label htmlFor="id" className={styles.label}>
                  Identifier
                </label>
                <Input
                  id="id"
                  name="id"
                  value={formState.id}
                  onChange={handleInputChange}
                  placeholder="wright-resurrection"
                  required={!editingSourceId}
                  disabled={Boolean(editingSourceId)}
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="work" className={styles.label}>
                  Work
                </label>
                <Input
                  id="work"
                  name="work"
                  value={formState.work}
                  onChange={handleInputChange}
                  placeholder="The Resurrection of the Son of God"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="author" className={styles.label}>
                    Author
                  </label>
                  <Input
                    id="author"
                    name="author"
                    value={formState.author}
                    onChange={handleInputChange}
                    placeholder="N. T. Wright"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="type" className={styles.label}>
                    Category
                  </label>
                  <Input
                    id="type"
                    name="type"
                    value={formState.type}
                    onChange={handleInputChange}
                    placeholder="ModernApologist"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="year_or_era" className={styles.label}>
                    Year or Era
                  </label>
                  <Input
                    id="year_or_era"
                    name="year_or_era"
                    value={formState.year_or_era}
                    onChange={handleInputChange}
                    placeholder="2003"
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="location" className={styles.label}>
                    Location / Pages
                  </label>
                  <Input
                    id="location"
                    name="location"
                    value={formState.location}
                    onChange={handleInputChange}
                    placeholder="Chapter 2, Pages 35–60"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="url" className={styles.label}>
                  URL
                </label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  value={formState.url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/resource"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label}>
                  Notes
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formState.notes}
                  onChange={handleInputChange}
                  placeholder="Summary of why this source is helpful."
                  className={styles.textarea}
                />
              </div>
              <div className={styles.formFooter}>
                <Button
                  variant="ghost"
                  onClick={resetModal}
                  className={styles.modalButton}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  form="source-form"
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    styles.modalButton,
                    isSaving ? styles.busy : undefined,
                  )}
                >
                  {isSaving
                    ? editingSourceId
                      ? "Saving…"
                      : "Creating…"
                    : editingSourceId
                      ? "Save Changes"
                      : "Create Source"}
                </Button>
              </div>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
