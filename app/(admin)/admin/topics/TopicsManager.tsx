"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
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
import type { Counter } from "@/types/apologetics";

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
};

type ObjectionForm = Pick<Counter, "objection" | "rebuttal">;

const defaultFormState: TopicFormState = {
  title: "",
  objection: "",
  claim: "",
  summary: "",
  difficulty: "intro",
  est_minutes: "8",
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
  const router = useRouter();
  const [topics, setTopics] = useState<AdminTopic[]>(initialTopics);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [formState, setFormState] =
    useState<TopicFormState>(defaultFormState);
  const [extraObjections, setExtraObjections] = useState<ObjectionForm[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

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
    setExtraObjections([]);
    setTags([]);
    setTagInput("");
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
    });
    setExtraObjections([]);
    setTags(topic.tags ?? []);
    setTagInput("");
    setIsModalOpen(true);
    void loadExistingCounters(topic.id);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setIsSaving(false);
    setEditingTopicId(null);
    setFormState(defaultFormState);
    setExtraObjections([]);
    setTags([]);
    setTagInput("");
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

  const addExtraObjection = () => {
    setExtraObjections((prev) => [
      ...prev,
      { objection: "", rebuttal: "" },
    ]);
  };

  const updateExtraObjection = (
    index: number,
    field: keyof ObjectionForm,
    value: string,
  ) => {
    setExtraObjections((prev) =>
      prev.map((entry, idx) =>
        idx === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const removeExtraObjection = (index: number) => {
    setExtraObjections((prev) => prev.filter((_, idx) => idx !== index));
  };

  const loadExistingCounters = async (topicId: string) => {
    try {
      const response = await fetch(`/api/topics/${topicId}/counters`);
      if (!response.ok) {
        return;
      }
      const counters = (await response.json()) as Counter[];
      setExtraObjections(
        counters.map((entry) => ({
          objection: entry.objection ?? "",
          rebuttal: entry.rebuttal ?? "",
        })),
      );
    } catch (error) {
      console.error("Unable to load counters", error);
    }
  };

  const handleTagInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTagInput(event.target.value);
  };

  const commitTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    const lowered = value.toLowerCase();
    if (tags.includes(lowered)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, lowered]);
    setTagInput("");
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitTag();
    }
    if (event.key === "Backspace" && tagInput.length === 0 && tags.length) {
      event.preventDefault();
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const removeTag = (value: string) => {
    setTags((prev) => prev.filter((tag) => tag !== value));
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

    const extraPayloads = extraObjections
      .map((entry) => ({
        objection: entry.objection.trim(),
        rebuttal: entry.rebuttal.trim(),
      }))
      .filter((entry) => entry.objection.length || entry.rebuttal.length);

    const payload: Record<string, unknown> = {
      title: formState.title.trim(),
      objection: formState.objection.trim() || null,
      claim: formState.claim.trim() || null,
      summary: formState.summary.trim() || null,
      difficulty: formState.difficulty,
      est_minutes: minutesValue,
      tags,
    };

    payload.objections = extraPayloads.map((entry) => ({
      objection: entry.objection,
      summary: entry.rebuttal,
    }));

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

      const mapped = mapTopic(data.topic ?? data);

      setExtraObjections([]);
      setTags([]);
      setTagInput("");

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
      if (!editingTopicId) {
        router.push(`/apologetics/topics/${mapped.id}`);
      }
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
                    Estimated Reading Time (mins)
                  </label>
                  <Input
                    id="est_minutes"
                    name="est_minutes"
                    type="number"
                    min={0}
                    value={formState.est_minutes}
                    onChange={handleInputChange}
                    placeholder="8"
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="tagInput" className={styles.label}>
                  Tags
                </label>
                <div className={styles.tagComposer}>
                  <Input
                    id="tagInput"
                    value={tagInput}
                    onChange={handleTagInputChange}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add tags like law, fulfillment, covenant"
                    className={styles.input}
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={commitTag}
                    disabled={!tagInput.trim() || isSaving}
                    className={styles.tagButton}
                  >
                    Add Tag
                  </Button>
                </div>
                {tags.length ? (
                  <div className={styles.tagPillRow}>
                    {tags.map((tag) => (
                      <span key={tag} className={styles.tagPill}>
                        {tag}
                        <button
                          type="button"
                          className={styles.tagRemove}
                          onClick={() => removeTag(tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className={styles.field}>
                <div className={styles.extraHeader}>
                  <div className={styles.extraHeading}>
                    <h3 className={styles.managerTitle}>
                      Additional Objections (Optional)
                    </h3>
                    <p className={styles.managerMeta}>
                      Each objection will appear under this topic’s details as a
                      separate counterpoint.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={addExtraObjection}
                    className={styles.addButton}
                    disabled={isSaving}
                  >
                    <PlusIcon size={16} aria-hidden="true" />
                    Add Another Objection
                  </Button>
                </div>

                {extraObjections.length === 0 ? (
                  <p className={styles.extraNotice}>
                    Each objection will appear under this topic’s details as a
                    separate counterpoint. Use “Add Another Objection” to include
                    more perspectives.
                  </p>
                ) : (
                  <div className={styles.managerContainer}>
                    {extraObjections.map((entry, index) => (
                      <div
                        key={`extra-objection-${index}`}
                        className={cn(styles.form, styles.extraForm)}
                      >
                        <div className={styles.field}>
                          <label
                            htmlFor={`extra-objection-${index}`}
                            className={styles.label}
                          >
                            Objection
                          </label>
                          <Textarea
                            id={`extra-objection-${index}`}
                            value={entry.objection}
                            className={styles.textarea}
                            placeholder="Enter the additional objection or claim."
                            onChange={(event) =>
                              updateExtraObjection(
                                index,
                                "objection",
                                event.target.value,
                              )
                            }
                          />
                        </div>

                        <div className={styles.field}>
                          <label
                            htmlFor={`extra-rebuttal-${index}`}
                            className={styles.label}
                          >
                            Rebuttal (Answer)
                          </label>
                          <Textarea
                            id={`extra-rebuttal-${index}`}
                            value={entry.rebuttal}
                            className={styles.textarea}
                            placeholder="Write the rebuttal or counter-argument."
                            onChange={(event) =>
                              updateExtraObjection(
                                index,
                                "rebuttal",
                                event.target.value,
                              )
                            }
                          />
                        </div>

                        <div className={styles.formFooter}>
                          <Button
                            type="button"
                            variant="destructive"
                            className={styles.modalButton}
                            onClick={() => removeExtraObjection(index)}
                            disabled={isSaving}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.formFooter}>
                <Button
                  variant="ghost"
                  onClick={resetModal}
                  className={styles.modalButton}
                  type="button"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  form="topic-form"
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    styles.modalButton,
                    isSaving ? styles.busy : undefined,
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
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
