import { NextResponse } from "next/server";

import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CommentRow = {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  pre_read_id: string;
};

async function resolveCommentAccess(commentId: string) {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const adminClient = getServiceRoleClient();

  const { data: commentData, error: commentError } = await adminClient
    .from("pre_read_comments")
    .select("id, content, created_at, parent_id, user_id, pre_read_id")
    .eq("id", commentId)
    .maybeSingle();

  if (commentError) {
    return {
      error: NextResponse.json(
        { error: commentError.message },
        { status: 500 },
      ),
    } as const;
  }

  const comment = commentData as CommentRow | null;

  if (!comment) {
    return {
      error: NextResponse.json({ error: "Comment not found" }, { status: 404 }),
    } as const;
  }

  const isOwner = comment.user_id === session.user.id;
  if (!isAdmin && !isOwner) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return {
    session,
    isAdmin,
    isOwner,
    adminClient,
    comment,
  } as const;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const access = await resolveCommentAccess(commentId);
  if ("error" in access) {
    return access.error;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Payload must be an object" },
      { status: 400 },
    );
  }

  const content =
    typeof (payload as { content?: unknown }).content === "string"
      ? (payload as { content: string }).content.trim()
      : "";

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  const { adminClient, session, isAdmin } = access;

  const { data: updatedData, error } = await adminClient
    .from("pre_read_comments")
    .update({ content } as never)
    .eq("id", commentId)
    .select("id, content, created_at, parent_id, user_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const data = updatedData as Omit<CommentRow, "pre_read_id"> | null;

  if (!data) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const { data: authorData } = await adminClient
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", data.user_id)
    .maybeSingle();

  const author = authorData as {
    username: string | null;
    avatar_url: string | null;
  } | null;

  return NextResponse.json({
    ...data,
    author: {
      username: author?.username ?? "Member",
      avatar_url: author?.avatar_url ?? null,
    },
    can_delete: isAdmin || data.user_id === session.user.id,
    can_edit: isAdmin || data.user_id === session.user.id,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await context.params;
  const access = await resolveCommentAccess(commentId);
  if ("error" in access) {
    return access.error;
  }

  const { adminClient } = access;

  const { data: deletedData, error } = await adminClient
    .from("pre_read_comments")
    .delete()
    .eq("id", commentId)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const data = deletedData as { id: string } | null;

  if (!data) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
