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

type RawTopicRecord = {
  id: string;
  title: string | null;
  objection: string | null;
  claim: string | null;
  summary: string | null;
  difficulty: string | null;
  est_minutes: number | null;
  tags: string[] | string | null;
  updated_at: string | null;
  error?: string;
};

const mapTopic = (topic: RawTopicRecord): AdminTopic => ({
  id: topic.id,
  title: topic.title ?? "",
  objection: topic.objection ?? "",
  claim: topic.claim ?? "",
  summary: topic.summary ?? "",
  difficulty: topic.difficulty ?? "intro",
  est_minutes: typeof topic.est_minutes === "number" ? topic.est_minutes : null,
  tags: Array.isArray(topic.tags)
    ? topic.tags.filter((tag): tag is string => Boolean(tag))
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
  const [formState, setFormState] = useState<TopicFormState>(defaultFormState);

  const sortedTopics = useMemo(
    () =>
      [...topics].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      ),
    [topics]
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
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
        }
      );

      const data: RawTopicRecord & { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to save topic");
      }

      const mapped = mapTopic(data);

      setTopics((prev) => {
        if (editingTopicId) {
          return prev.map((topic) =>
            topic.id === editingTopicId ? mapped : topic
          );
        }
        return [mapped, ...prev];
      });

      toast.success(
        editingTopicId ? "Topic updated successfully." : "Topic created."
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
      `Are you sure you want to delete “${topic.title}”?`
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/topics/${topic.id}`, {
        method: "DELETE",
      });

      const data: { success?: boolean; error?: string } = await response.json();

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
      <div className={styles.managerContainer}>
        <div className={styles.managerHeader}>
          <div className={styles.managerHeading}>
            <h2 className={styles.managerTitle}>Published Topics</h2>
            <p className={styles.managerMeta}>
              {topics.length} topic{topics.length === 1 ? "" : "s"} in the
              catalog.
            </p>
          </div>
          <div className={styles.actions}>
            <Button onClick={openCreate} className={styles.addButton}>
              <PlusIcon size={16} aria-hidden="true" />
              New Topic
            </Button>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th className={styles.tableHeadCell}>Title</th>
                <th className={styles.tableHeadCell}>Difficulty</th>
                <th className={styles.tableHeadCell}>Est. Minutes</th>
                <th className={styles.tableHeadCell}>Tags</th>
                <th className={cn(styles.tableHeadCell, styles.alignRight)}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTopics.map((topic) => (
                <tr key={topic.id} className={styles.tableRow}>
                  <td className={styles.tableCell} data-label="Title">
                    <div>
                      <p>{topic.title || "Untitled Topic"}</p>
                      {topic.summary ? (
                        <p className={styles.summary}>{topic.summary}</p>
                      ) : null}
                    </div>
                  </td>
                  <td className={styles.tableCell} data-label="Difficulty">
                    {topic.difficulty || "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Est. Minutes">
                    {topic.est_minutes ?? "—"}
                  </td>
                  <td className={styles.tableCell} data-label="Tags">
                    <span className={styles.tagList}>
                      {topic.tags.length ? topic.tags.join(", ") : "—"}
                    </span>
                  </td>
                  <td className={styles.tableCell} data-label="Actions">
                    <div className={styles.buttonGroup}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(topic)}
                        className={styles.iconButton}
                      >
                        <Pencil size={16} aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(topic)}
                        className={cn(styles.iconButton, styles.danger)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedTopics.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState} data-label="">
                    No topics yet. Create one to get started.
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
              {editingTopicId ? "Edit Topic" : "Create Topic"}
            </ModalTitle>
            <p className={styles.managerMeta}>
              Provide an objection, claim, and summary to equip learners.
            </p>
          </ModalHeader>
          <ModalBody className={styles.modalBody}>
            <form
              id="topic-form"
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
                  placeholder="The resurrection is historically reliable"
                  required
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="objection" className={styles.label}>
                  Objection
                </label>
                <Textarea
                  id="objection"
                  name="objection"
                  value={formState.objection}
                  onChange={handleInputChange}
                  placeholder="Skeptics argue the resurrection was a myth created later."
                  className={styles.textarea}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="claim" className={styles.label}>
                  Claim
                </label>
                <Textarea
                  id="claim"
                  name="claim"
                  value={formState.claim}
                  onChange={handleInputChange}
                  placeholder="Early eyewitness testimony and empty-tomb evidence support the resurrection."
                  className={styles.textarea}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="summary" className={styles.label}>
                  Summary
                </label>
                <Textarea
                  id="summary"
                  name="summary"
                  value={formState.summary}
                  onChange={handleInputChange}
                  placeholder="Summarize the takeaway in a few sentences."
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
                    <SelectContent className={styles.selectContent}>
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
                    placeholder="e.g. 12"
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
                  placeholder="resurrection, history, evidence"
                  className={styles.input}
                />
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
                    form="topic-form"
                    type="submit"
                    disabled={isSaving}
                    className={cn(
                      styles.modalButton,
                      isSaving ? styles.busy : undefined
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
                </div>
              </div>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
