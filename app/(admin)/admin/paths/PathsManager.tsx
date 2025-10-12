"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil, PlusIcon, Trash2 } from "lucide-react";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">
              Learning Paths
            </h2>
            <p className="text-sm text-slate-400">
              {paths.length} path{paths.length === 1 ? "" : "s"} available to
              users.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="inline-flex items-center gap-2"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            New Path
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Subtitle</th>
                <th className="px-4 py-3 text-left">Difficulty</th>
                <th className="px-4 py-3 text-left">Est. Minutes</th>
                <th className="px-4 py-3 text-left">Tags</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedPaths.map((path) => (
                <tr
                  key={path.id}
                  className="hover:bg-slate-900/50 transition"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    <div className="space-y-1">
                      <p>{path.title || "Untitled Path"}</p>
                      {path.description ? (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {path.description}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {path.subtitle || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {path.difficulty || "—"}
                  </td>
                  <td className="px-4 py-3">{path.est_minutes ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {path.tags.length ? path.tags.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(path)}
                        className="inline-flex items-center gap-1"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(path)}
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedPaths.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No learning paths yet. Create one to begin.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
        <ModalContent size="lg" className="bg-slate-950/95">
          <ModalHeader className="space-y-1">
            <ModalTitle className="text-lg text-slate-100">
              {editingPathId ? "Edit Path" : "Create Path"}
            </ModalTitle>
            <p className="text-sm text-slate-400">
              Provide details for the learning path including description and
              tags.
            </p>
          </ModalHeader>
          <ModalBody>
            <form
              id="path-form"
              className="flex flex-col gap-4"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="title" className="text-sm text-slate-300">
                  Title
                </label>
                <Input
                  id="title"
                  name="title"
                  value={formState.title}
                  onChange={handleInputChange}
                  placeholder="Reliability of Scripture"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="subtitle" className="text-sm text-slate-300">
                  Subtitle
                </label>
                <Input
                  id="subtitle"
                  name="subtitle"
                  value={formState.subtitle}
                  onChange={handleInputChange}
                  placeholder="How we know the Bible we have is trustworthy"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="description"
                  className="text-sm text-slate-300"
                >
                  Description
                </label>
                <Textarea
                  id="description"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Provide a summary of what the learner will cover."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-slate-300">Difficulty</label>
                  <Select
                    value={formState.difficulty}
                    onValueChange={handleDifficultyChange}
                  >
                    <SelectTrigger>
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
                <div className="flex flex-col gap-2">
                  <label htmlFor="est_minutes" className="text-sm text-slate-300">
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
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="tags" className="text-sm text-slate-300">
                  Tags (comma separated)
                </label>
                <Input
                  id="tags"
                  name="tags"
                  value={formState.tags}
                  onChange={handleInputChange}
                  placeholder="scripture, reliability, manuscripts"
                />
              </div>
            </form>
          </ModalBody>
          <ModalFooter className="gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              onClick={resetModal}
              className="sm:w-auto"
              type="button"
            >
              Cancel
            </Button>
            <Button
              form="path-form"
              type="submit"
              disabled={isSaving}
              className={cn(
                "sm:w-auto",
                isSaving ? "cursor-progress opacity-80" : "",
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
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
