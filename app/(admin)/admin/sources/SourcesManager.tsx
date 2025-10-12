"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { BookOpenCheck, Pencil, PlusIcon, Trash2 } from "lucide-react";

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
import { cn } from "@/components/ui/utils";

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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">
              Reference Library
            </h2>
            <p className="text-sm text-slate-400">
              {sources.length} source{sources.length === 1 ? "" : "s"} curated
              for apologetics content.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="inline-flex items-center gap-2"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            New Source
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Work</th>
                <th className="px-4 py-3 text-left">Author</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Year / Era</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedSources.map((source) => (
                <tr
                  key={source.id}
                  className="hover:bg-slate-900/50 transition"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2">
                        <BookOpenCheck
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                        {source.work || "Untitled work"}
                      </p>
                      {source.notes ? (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {source.notes}
                        </p>
                      ) : null}
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline decoration-dotted decoration-primary/50 hover:text-primary/80"
                        >
                          {source.url}
                        </a>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {source.author || "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {source.type || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {source.year_or_era || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {source.location || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(source)}
                        className="inline-flex items-center gap-1"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source)}
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedSources.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No sources have been added yet.
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
              {editingSourceId ? "Edit Source" : "Create Source"}
            </ModalTitle>
            <p className="text-sm text-slate-400">
              Provide bibliographic details. All fields are optional except the
              work title and identifier.
            </p>
          </ModalHeader>
          <ModalBody>
            <form
              id="source-form"
              className="flex flex-col gap-4"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="id" className="text-sm text-slate-300">
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
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="work" className="text-sm text-slate-300">
                  Work
                </label>
                <Input
                  id="work"
                  name="work"
                  value={formState.work}
                  onChange={handleInputChange}
                  placeholder="The Resurrection of the Son of God"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="author" className="text-sm text-slate-300">
                    Author
                  </label>
                  <Input
                    id="author"
                    name="author"
                    value={formState.author}
                    onChange={handleInputChange}
                    placeholder="N. T. Wright"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="type" className="text-sm text-slate-300">
                    Category
                  </label>
                  <Input
                    id="type"
                    name="type"
                    value={formState.type}
                    onChange={handleInputChange}
                    placeholder="ModernApologist"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="year_or_era"
                    className="text-sm text-slate-300"
                  >
                    Year or Era
                  </label>
                  <Input
                    id="year_or_era"
                    name="year_or_era"
                    value={formState.year_or_era}
                    onChange={handleInputChange}
                    placeholder="2003"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="location" className="text-sm text-slate-300">
                    Location / Pages
                  </label>
                  <Input
                    id="location"
                    name="location"
                    value={formState.location}
                    onChange={handleInputChange}
                    placeholder="Chapter 2, Pages 35–60"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="url" className="text-sm text-slate-300">
                  URL
                </label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  value={formState.url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/resource"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="notes" className="text-sm text-slate-300">
                  Notes
                </label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formState.notes}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Summary of why this source is helpful."
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
              form="source-form"
              type="submit"
              disabled={isSaving}
              className={cn(
                "sm:w-auto",
                isSaving ? "cursor-progress opacity-80" : "",
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
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
