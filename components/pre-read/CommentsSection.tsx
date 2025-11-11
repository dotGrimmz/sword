"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import styles from "./CommentsSection.module.css";

type CommentRecord = {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  can_delete: boolean;
  author: {
    username: string | null;
    avatar_url: string | null;
  };
};

interface CommentsSectionProps {
  preReadId: string;
  className?: string;
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
  onReplyToggle: (id: string | null) => void;
  onReplySubmit: (parentId: string) => void;
  onDelete: (id: string) => Promise<void>;
  setReplyValue: (value: string) => void;
};

const CommentItem = ({
  comment,
  replies,
  replyingTo,
  replyValue,
  onReplyToggle,
  onReplySubmit,
  onDelete,
  setReplyValue,
}: CommentItemProps) => {
  const fallback =
    comment.author.username
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "M";

  return (
    <div className={styles.item}>
      <div className={styles.itemHeader}>
        <Avatar>
          {comment.author.avatar_url ? (
            <AvatarImage
              src={comment.author.avatar_url}
              alt={comment.author.username ?? "Member"}
            />
          ) : null}
          <AvatarFallback>{fallback}</AvatarFallback>
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
      <p className={styles.itemBody}>{comment.content}</p>
      <div className={styles.itemActions}>
        <button
          type="button"
          onClick={() =>
            onReplyToggle(replyingTo === comment.id ? null : comment.id)
          }
        >
          {replyingTo === comment.id ? "Cancel" : "Reply"}
        </button>
        {comment.can_delete ? (
          <button type="button" onClick={() => onDelete(comment.id)}>
            Delete
          </button>
        ) : null}
      </div>
      {replyingTo === comment.id ? (
        <div className={styles.replyTrail}>
          <Textarea
            placeholder="Write a reply..."
            value={replyValue}
            onChange={(event) => setReplyValue(event.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => onReplySubmit(comment.id)}
            >
              Post Reply
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onReplyToggle(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {replies.length > 0 ? (
        <div className={styles.replyTrail}>
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              replyingTo={replyingTo}
              replyValue={replyValue}
              onReplyToggle={onReplyToggle}
              onReplySubmit={onReplySubmit}
              onDelete={onDelete}
              setReplyValue={setReplyValue}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export function CommentsSection({ preReadId, className }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
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
        error instanceof Error ? error.message : "Unexpected error loading comments.",
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unexpected error posting comment.",
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
        error instanceof Error ? error.message : "Unexpected error deleting comment.",
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
  };

  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Comments</p>
        <h3 className={styles.title}>Share your reflections</h3>
        <p className={styles.subtitle}>
          Join the discussion with one level of replies per thread.
        </p>
      </header>

      <div className={styles.editor}>
        <Textarea
          placeholder="Share what stood out to you..."
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => postComment(newComment, null)}
            disabled={submitting}
          >
            {submitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.empty}>Loading comments…</p>
        ) : grouped.roots.length === 0 ? (
          <p className={styles.empty}>
            No comments yet. Be the first to share.
          </p>
        ) : (
          grouped.roots.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={grouped.repliesMap.get(comment.id) ?? []}
              replyingTo={replyingTo}
              replyValue={replyContent}
              onReplyToggle={handleReplyToggle}
              onReplySubmit={(parentId) => postComment(replyContent, parentId)}
              onDelete={deleteComment}
              setReplyValue={setReplyContent}
            />
          ))
        )}
      </div>
    </section>
  );
}
