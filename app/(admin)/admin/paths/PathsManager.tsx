"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, PlusIcon, Trash2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/components/ui/utils";

import styles from "../AdminManager.module.css";

type AdminPath = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: string;
  est_minutes: number | null;
  tags: string[];
  updated_at: string | null;
};

interface PathsManagerProps {
  initialPaths: AdminPath[];
}

type PathFormState = {
  title: string;
  subtitle: string;
  description: string;
  difficulty: string;
  est_minutes: string;
  tags: string;
};

const defaultFormState: PathFormState = {
  title: "",
  subtitle: "",
  description: "",
  difficulty: "intro",
  est_minutes: "",
  tags: "",
};

const difficulties = [
  { value: "intro", label: "Intro" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const toTagArray = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const mapPath = (path: any): AdminPath => ({
  id: path.id,
  title: path.title ?? "",
  subtitle: path.subtitle ?? "",
  description: path.description ?? "",
  difficulty: path.difficulty ?? "intro",
  est_minutes:
    typeof path.est_minutes === "number" ? path.est_minutes : null,
  tags: Array.isArray(path.tags)
    ? path.tags.filter(Boolean)
    : typeof path.tags === "string"
      ? toTagArray(path.tags)
      : [],
  updated_at: path.updated_at ?? null,
});

export default function PathsManager({ initialPaths }: PathsManagerProps) {
  const [paths, setPaths] = useState<AdminPath[]>(initialPaths);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<PathFormState>(defaultFormState);

  const sortedPaths = useMemo(
    () =>
      [...paths].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      ),
    [paths],
  );

  const openCreate = () => {
    setEditingPathId(null);
    setFormState(defaultFormState);
    setIsModalOpen(true);
  };

  const openEdit = (path: AdminPath) => {
    setEditingPathId(path.id);
    setFormState({
      title: path.title,
      subtitle: path.subtitle,
      description: path.description,
      difficulty: path.difficulty ?? "intro",
      est_minutes: path.est_minutes?.toString() ?? "",
      tags: path.tags.join(", "),
    });
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setIsSaving(false);
    setEditingPathId(null);
    setFormState(defaultFormState);
  };

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleDifficultyChange = (value: string) => {
    setFormState((prev) => ({ ...prev, difficulty: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const hasMinutes = formState.est_minutes.trim().length > 0;
    let minutesValue: number | null = null;

    if (hasMinutes) {
      const parsed = Number.parseInt(formState.est_minutes, 10);
      if (Number.isNaN(parsed)) {
        toast.error("Estimated minutes must be a valid number.");
        setIsSaving(false);
        return;
      }
      minutesValue = parsed;
    }

    const payload = {
      title: formState.title.trim(),
      subtitle: formState.subtitle.trim() || null,
      description: formState.description.trim() || null,
      difficulty: formState.difficulty,
      est_minutes: minutesValue,
      tags: toTagArray(formState.tags),
    };

    try {
      const response = await fetch(
        editingPathId ? `/api/paths/${editingPathId}` : "/api/paths",
        {
          method: editingPathId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to save path");
      }

      const mapped = mapPath(data);

      setPaths((prev) => {
        if (editingPathId) {
          return prev.map((path) =>
            path.id === editingPathId ? mapped : path,
          );
        }
        return [mapped, ...prev];
      });

      toast.success(
        editingPathId ? "Path updated successfully." : "Path created.",
      );
      resetModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save path";
      toast.error(message);
      setIsSaving(false);
    }
  };

  const handleDelete = async (path: AdminPath) => {
    const confirmed = window.confirm(
      `Delete the learning path “${path.title}”?`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/paths/${path.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to delete path");
      }

      setPaths((prev) => prev.filter((entry) => entry.id !== path.id));
      toast.success("Path deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete path";
      toast.error(message);
    }
  };

  return (
    <>
      <div className={styles.managerContainer}>
        <div className={styles.managerHeader}>
          <div className={styles.managerHeading}>
            <h2 className={styles.managerTitle}>Learning Paths</h2>
            <p className={styles.managerMeta}>
              {paths.length} path{paths.length === 1 ? "" : "s"} available to
              users.
            </p>
          </div>
          <div className={styles.actions}>
            <Button onClick={openCreate} className={styles.addButton}>
              <PlusIcon size={16} aria-hidden="true" />
              New Path
            </Button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>Title</th>
                <th className={styles.tableHeadCell}>Subtitle</th>
                <th className={styles.tableHeadCell}>Difficulty</th>
                <th className={styles.tableHeadCell}>Est. Minutes</th>
                <th className={styles.tableHeadCell}>Tags</th>
                <th className={cn(styles.tableHeadCell, styles.alignRight)}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPaths.map((path) => (
                <tr key={path.id} className={styles.tableRow}>
                  <td className={styles.tableCell} data-label="Title">
                    <div>
                      <p>{path.title || "Untitled Path"}</p>
                      {path.description ? (
                        <p className={styles.summary}>{path.description}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className={styles.tableCell} data-label="Subtitle">
                    {path.subtitle || "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Difficulty">
                    {path.difficulty || "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Est. Minutes">
                    {path.est_minutes ?? "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Tags">
                    <span className={styles.tagList}>
                      {path.tags.length ? path.tags.join(", ") : "—"}
                    </span>
                  </td>
                  <td className={styles.tableCell} data-label="Actions">
                    <div className={styles.buttonGroup}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(path)}
                        className={styles.iconButton}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(path)}
                        className={cn(styles.iconButton, styles.danger)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedPaths.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState} data-label="">
                    No learning paths yet. Create one to begin.
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
              {editingPathId ? "Edit Path" : "Create Path"}
            </ModalTitle>
            <p className={styles.managerMeta}>
              Provide details for the learning path including description and
              tags.
            </p>
          </ModalHeader>
          <ModalBody className={styles.modalBody}>
            <form
              id="path-form"
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <div className={styles.field}>
                <label htmlFor="title" className={styles.label}>
                  Title
                </label>
                <Input
                  id="title"
                  name="title"
                  value={formState.title}
                  onChange={handleInputChange}
                  placeholder="Reliability of Scripture"
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="subtitle" className={styles.label}>
                  Subtitle
                </label>
                <Input
                  id="subtitle"
                  name="subtitle"
                  value={formState.subtitle}
                  onChange={handleInputChange}
                  placeholder="How we know the Bible we have is trustworthy"
                  className={styles.input}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="description" className={styles.label}>
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  placeholder="Provide a summary of what the learner will cover."
                  className={styles.textarea}
                />
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <span className={styles.label}>Difficulty</span>
                  <Select
                    value={formState.difficulty}
                    onValueChange={handleDifficultyChange}
                  >
                    <SelectTrigger className={styles.selectTrigger}>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="est_minutes" className={styles.label}>
                    Estimated Minutes
                  </label>
                  <Input
                    id="est_minutes"
                    name="est_minutes"
                    type="number"
                    min={0}
                    value={formState.est_minutes}
                    onChange={handleInputChange}
                    placeholder="e.g. 45"
                    className={styles.input}
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="tags" className={styles.label}>
                  Tags (comma separated)
                </label>
                <Input
                  id="tags"
                  name="tags"
                  value={formState.tags}
                  onChange={handleInputChange}
                  placeholder="scripture, reliability, manuscripts"
                  className={styles.input}
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
                  form="path-form"
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    styles.modalButton,
                    isSaving ? styles.busy : undefined,
                  )}
                >
                  {isSaving
                    ? editingPathId
                      ? "Saving…"
                      : "Creating…"
                    : editingPathId
                      ? "Save Changes"
                      : "Create Path"}
                </Button>
              </div>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
