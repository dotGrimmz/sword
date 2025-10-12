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

type AdminTopic = {
  id: string;
  title: string;
  objection: string;
  claim: string;
  summary: string;
  difficulty: string;
  est_minutes: number | null;
  tags: string[];
  updated_at: string | null;
};

interface TopicsManagerProps {
  initialTopics: AdminTopic[];
}

type TopicFormState = {
  title: string;
  objection: string;
  claim: string;
  summary: string;
  difficulty: string;
  est_minutes: string;
  tags: string;
};

const defaultFormState: TopicFormState = {
  title: "",
  objection: "",
  claim: "",
  summary: "",
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

const mapTopic = (topic: any): AdminTopic => ({
  id: topic.id,
  title: topic.title ?? "",
  objection: topic.objection ?? "",
  claim: topic.claim ?? "",
  summary: topic.summary ?? "",
  difficulty: topic.difficulty ?? "intro",
  est_minutes:
    typeof topic.est_minutes === "number" ? topic.est_minutes : null,
  tags: Array.isArray(topic.tags)
    ? topic.tags.filter(Boolean)
    : typeof topic.tags === "string"
      ? toTagArray(topic.tags)
      : [],
  updated_at: topic.updated_at ?? null,
});

export default function TopicsManager({ initialTopics }: TopicsManagerProps) {
  const [topics, setTopics] = useState<AdminTopic[]>(initialTopics);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<TopicFormState>(defaultFormState);

  const sortedTopics = useMemo(
    () =>
      [...topics].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      ),
    [topics],
  );

  const openCreate = () => {
    setEditingTopicId(null);
    setFormState(defaultFormState);
    setIsModalOpen(true);
  };

  const openEdit = (topic: AdminTopic) => {
    setEditingTopicId(topic.id);
    setFormState({
      title: topic.title,
      objection: topic.objection,
      claim: topic.claim,
      summary: topic.summary,
      difficulty: topic.difficulty ?? "intro",
      est_minutes: topic.est_minutes?.toString() ?? "",
      tags: topic.tags.join(", "),
    });
    setIsModalOpen(true);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setIsSaving(false);
    setEditingTopicId(null);
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
      objection: formState.objection.trim() || null,
      claim: formState.claim.trim() || null,
      summary: formState.summary.trim() || null,
      difficulty: formState.difficulty,
      est_minutes: minutesValue,
      tags: toTagArray(formState.tags),
    };

    try {
      const response = await fetch(
        editingTopicId ? `/api/topics/${editingTopicId}` : "/api/topics",
        {
          method: editingTopicId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to save topic");
      }

      const mapped = mapTopic(data);

      setTopics((prev) => {
        if (editingTopicId) {
          return prev.map((topic) =>
            topic.id === editingTopicId ? mapped : topic,
          );
        }
        return [mapped, ...prev];
      });

      toast.success(
        editingTopicId ? "Topic updated successfully." : "Topic created.",
      );
      resetModal();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save topic";
      toast.error(message);
      setIsSaving(false);
    }
  };

  const handleDelete = async (topic: AdminTopic) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete “${topic.title}”?`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/topics/${topic.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to delete topic");
      }

      setTopics((prev) => prev.filter((entry) => entry.id !== topic.id));
      toast.success("Topic deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete topic";
      toast.error(message);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/50 p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-100">
              Published Topics
            </h2>
            <p className="text-sm text-slate-400">
              {topics.length} topic{topics.length === 1 ? "" : "s"} in the
              catalog.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="inline-flex items-center gap-2"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            New Topic
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full divide-y divide-slate-800/60 text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Difficulty</th>
                <th className="px-4 py-3 text-left">Est. Minutes</th>
                <th className="px-4 py-3 text-left">Tags</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sortedTopics.map((topic) => (
                <tr
                  key={topic.id}
                  className="hover:bg-slate-900/50 transition"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    <div className="space-y-1">
                      <p>{topic.title || "Untitled Topic"}</p>
                      {topic.summary ? (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {topic.summary}
                        </p>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {topic.difficulty || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {topic.est_minutes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {topic.tags.length ? topic.tags.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(topic)}
                        className="inline-flex items-center gap-1"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(topic)}
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedTopics.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No topics yet. Create one to get started.
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
              {editingTopicId ? "Edit Topic" : "Create Topic"}
            </ModalTitle>
            <p className="text-sm text-slate-400">
              Provide an objection, claim, and summary to equip learners.
            </p>
          </ModalHeader>
          <ModalBody>
            <form
              id="topic-form"
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
                  placeholder="The resurrection is historically reliable"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="objection" className="text-sm text-slate-300">
                  Objection
                </label>
                <Textarea
                  id="objection"
                  name="objection"
                  value={formState.objection}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Skeptics argue the resurrection was a myth created later."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="claim" className="text-sm text-slate-300">
                  Claim
                </label>
                <Textarea
                  id="claim"
                  name="claim"
                  value={formState.claim}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Early eyewitness testimony and empty-tomb evidence support the resurrection."
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="summary" className="text-sm text-slate-300">
                  Summary
                </label>
                <Textarea
                  id="summary"
                  name="summary"
                  value={formState.summary}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Summarize the takeaway in a few sentences."
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
                    placeholder="e.g. 12"
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
                  placeholder="resurrection, history, evidence"
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
              form="topic-form"
              type="submit"
              disabled={isSaving}
              className={cn(
                "sm:w-auto",
                isSaving ? "cursor-progress opacity-80" : "",
              )}
            >
              {isSaving
                ? editingTopicId
                  ? "Saving…"
                  : "Creating…"
                : editingTopicId
                  ? "Save Changes"
                  : "Create Topic"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
