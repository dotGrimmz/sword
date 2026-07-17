"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import controls from "@/components/realign/controls.module.css";

import styles from "./CommentsSection.module.css";

type CommentRecord = {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  can_delete: boolean;
  can_edit?: boolean;
  author: {
    username: string | null;
    avatar_url: string | null;
  };
};

interface CommentsSectionProps {
  preReadId: string;
  className?: string;
  /** Admin moderation copy and emphasis on edit/delete. */
  moderation?: boolean;
}

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

type CommentItemProps = {
  comment: CommentRecord;
  replies: CommentRecord[];
  replyingTo: string | null;
  replyValue: string;
  editingId: string | null;
  editValue: string;
  onReplyToggle: (id: string | null) => void;
  onReplySubmit: (parentId: string) => void;
  onDelete: (id: string) => Promise<void>;
  onEditToggle: (id: string | null, content?: string) => void;
  onEditSubmit: (id: string) => void;
  setReplyValue: (value: string) => void;
  setEditValue: (value: string) => void;
};

const CommentItem = ({
  comment,
  replies,
  replyingTo,
  replyValue,
  editingId,
  editValue,
  onReplyToggle,
  onReplySubmit,
  onDelete,
  onEditToggle,
  onEditSubmit,
  setReplyValue,
  setEditValue,
}: CommentItemProps) => {
  const isEditing = editingId === comment.id;
  const canEdit = Boolean(comment.can_edit);

  return (
    <li className={styles.item}>
      <div className={styles.itemHeader}>
        <Avatar className={styles.itemAvatar}>
          {comment.author.avatar_url ? (
            <AvatarImage
              src={comment.author.avatar_url}
              alt={comment.author.username ?? "Member"}
            />
          ) : null}
        </Avatar>
        <div className={styles.itemMeta}>
          <p className={styles.itemName}>
            {comment.author.username ?? "Member"}
          </p>
          <span className={styles.itemTimestamp}>
            {formatTimestamp(comment.created_at)}
          </span>
        </div>
      </div>
      {isEditing ? (
        <div className={styles.replyTrail}>
          <Textarea
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            rows={3}
            className={`${controls.control} ${controls.controlTextarea}`}
          />
          <div className={styles.replyActions}>
            <Button
              type="button"
              className={controls.btnPrimary}
              onClick={() => onEditSubmit(comment.id)}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              className={controls.btnSecondary}
              onClick={() => onEditToggle(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className={styles.itemBody}>{comment.content}</p>
      )}
      {!isEditing ? (
        <div className={styles.itemActions}>
          <button
            type="button"
            className={controls.btnGhost}
            onClick={() =>
              onReplyToggle(replyingTo === comment.id ? null : comment.id)
            }
          >
            {replyingTo === comment.id ? "Cancel" : "Reply"}
          </button>
          {canEdit ? (
            <button
              type="button"
              className={controls.btnGhost}
              onClick={() => onEditToggle(comment.id, comment.content)}
            >
              Edit
            </button>
          ) : null}
          {comment.can_delete ? (
            <button
              type="button"
              className={controls.btnDanger}
              onClick={() => onDelete(comment.id)}
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
      {replyingTo === comment.id ? (
        <div className={styles.replyTrail}>
          <Textarea
            placeholder="Write a reply..."
            value={replyValue}
            onChange={(event) => setReplyValue(event.target.value)}
            rows={2}
            className={`${controls.control} ${controls.controlTextarea}`}
          />
          <div className={styles.replyActions}>
            <Button
              type="button"
              className={controls.btnPrimary}
              onClick={() => onReplySubmit(comment.id)}
            >
              Post Reply
            </Button>
            <Button
              type="button"
              variant="outline"
              className={controls.btnSecondary}
              onClick={() => onReplyToggle(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {replies.length > 0 ? (
        <ul className={styles.replyTrail}>
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              replyingTo={replyingTo}
              replyValue={replyValue}
              editingId={editingId}
              editValue={editValue}
              onReplyToggle={onReplyToggle}
              onReplySubmit={onReplySubmit}
              onDelete={onDelete}
              onEditToggle={onEditToggle}
              onEditSubmit={onEditSubmit}
              setReplyValue={setReplyValue}
              setEditValue={setEditValue}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

export function CommentsSection({
  preReadId,
  className,
  moderation = false,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/pre-reads/${preReadId}/comments`);
      if (!response.ok) {
        throw new Error("Unable to load comments.");
      }
      const data = (await response.json()) as CommentRecord[];
      setComments(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unexpected error loading comments.",
      );
    } finally {
      setLoading(false);
    }
  }, [preReadId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  const grouped = useMemo(() => {
    const roots: CommentRecord[] = [];
    const repliesMap = new Map<string, CommentRecord[]>();

    for (const comment of comments) {
      if (comment.parent_id) {
        const bucket = repliesMap.get(comment.parent_id) ?? [];
        bucket.push(comment);
        repliesMap.set(comment.parent_id, bucket);
      } else {
        roots.push(comment);
      }
    }

    return { roots, repliesMap };
  }, [comments]);

  const postComment = async (content: string, parentId: string | null) => {
    if (!content.trim()) {
      toast.error("Please enter some text.");
      return;
    }

    setSubmitting(true);
    try {
      const isReply = Boolean(parentId);
      const response = await fetch(`/api/pre-reads/${preReadId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), parentId }),
      });

      if (!response.ok) {
        let message = "Unable to post comment.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = (await response.json()) as CommentRecord;
      setComments((prev) => [...prev, data]);
      if (parentId) {
        setReplyContent("");
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
      toast.success(isReply ? "Reply posted." : "Comment posted.");
      void fetchComments();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unexpected error posting comment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) {
      return;
    }
    try {
      const response = await fetch(`/api/pre-reads/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let message = "Unable to delete comment.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      toast.success("Comment deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unexpected error deleting comment.",
      );
    }
  };

  const saveEdit = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error("Please enter some text.");
      return;
    }

    try {
      const response = await fetch(`/api/pre-reads/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!response.ok) {
        let message = "Unable to update comment.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = (await response.json()) as CommentRecord;
      setComments((prev) =>
        prev.map((comment) => (comment.id === commentId ? data : comment)),
      );
      setEditingId(null);
      setEditContent("");
      toast.success("Comment updated.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unexpected error updating comment.",
      );
    }
  };

  const handleReplyToggle = (commentId: string | null) => {
    if (!commentId) {
      setReplyingTo(null);
      setReplyContent("");
      return;
    }
    setReplyingTo(commentId);
    setReplyContent("");
    setEditingId(null);
  };

  const handleEditToggle = (commentId: string | null, content?: string) => {
    if (!commentId) {
      setEditingId(null);
      setEditContent("");
      return;
    }
    setEditingId(commentId);
    setEditContent(content ?? "");
    setReplyingTo(null);
  };

  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          {moderation ? "Moderation" : "Comments"}
        </p>
        <h3 className={styles.title}>
          {moderation ? "Manage discussion" : "Share your reflections"}
        </h3>
        <p className={styles.subtitle}>
          {moderation
            ? "Edit or remove comments, and reply as an admin when needed."
            : "Join the discussion with one level of replies per thread."}
        </p>
      </header>

      <div className={styles.editor}>
        <Textarea
          placeholder={
            moderation
              ? "Post an admin note or reply…"
              : "Share what stood out to you..."
          }
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          rows={3}
          className={`${controls.control} ${controls.controlTextarea}`}
        />
        <div className={styles.editorActions}>
          <Button
            type="button"
            className={controls.btnPrimary}
            onClick={() => postComment(newComment, null)}
            disabled={submitting}
          >
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      <ul className={styles.list}>
        {loading ? (
          <li className={styles.empty}>Loading comments…</li>
        ) : grouped.roots.length === 0 ? (
          <li className={styles.empty}>
            No comments yet. Be the first to share.
          </li>
        ) : (
          grouped.roots.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={grouped.repliesMap.get(comment.id) ?? []}
              replyingTo={replyingTo}
              replyValue={replyContent}
              editingId={editingId}
              editValue={editContent}
              onReplyToggle={handleReplyToggle}
              onReplySubmit={(parentId) => postComment(replyContent, parentId)}
              onDelete={deleteComment}
              onEditToggle={handleEditToggle}
              onEditSubmit={(id) => void saveEdit(id)}
              setReplyValue={setReplyContent}
              setEditValue={setEditContent}
            />
          ))
        )}
      </ul>
    </section>
  );
}
