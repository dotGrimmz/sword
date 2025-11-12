import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const COMMENT_SELECT = `
  id,
  content,
  created_at,
  parent_id,
  user_id
`;

type CommentPayload = {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
};

const mapComment = (
  comment: CommentPayload,
  currentUserId: string,
  isAdmin: boolean,
  profileMap: Map<
    string,
    { username: string | null; avatar_url: string | null }
  >,
) => ({
  ...comment,
  author: {
    username: profileMap.get(comment.user_id)?.username ?? "Member",
    avatar_url: profileMap.get(comment.user_id)?.avatar_url ?? null,
  },
  can_delete: isAdmin || comment.user_id === currentUserId,
});

const buildProfileMap = (
  rows: Array<{ id: string; username: string | null; avatar_url: string | null }> | null,
) => {
  const map = new Map<string, { username: string | null; avatar_url: string | null }>();
  for (const row of rows ?? []) {
    map.set(row.id, { username: row.username, avatar_url: row.avatar_url });
  }
  return map;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, username, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const { data, error } = await supabase
    .from("pre_read_comments")
    .select(COMMENT_SELECT)
    .eq("pre_read_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "PGRST301" ? 403 : 500 },
    );
  }

  const authorIds = Array.from(new Set((data ?? []).map((row) => row.user_id)));
  let profileMap = new Map<
    string,
    { username: string | null; avatar_url: string | null }
  >();

  if (authorIds.length > 0) {
    const { data: authorProfiles, error: authorError } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", authorIds);

    if (authorError) {
      return NextResponse.json(
        { error: authorError.message },
        { status: 500 },
      );
    }

    profileMap = buildProfileMap(authorProfiles);
  }

  return NextResponse.json(
    (data ?? []).map((comment) =>
      mapComment(comment, session.user.id, isAdmin, profileMap),
    ),
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { content?: unknown; parentId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const content =
    typeof payload.content === "string" ? payload.content.trim() : "";

  if (!content) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 },
    );
  }

  let parentId: string | null = null;
  if (payload.parentId) {
    if (typeof payload.parentId !== "string") {
      return NextResponse.json(
        { error: "parentId must be a string" },
        { status: 400 },
      );
    }
    parentId = payload.parentId;

    const { data: parentComment, error: parentError } = await supabase
      .from("pre_read_comments")
      .select("id, pre_read_id")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError) {
      return NextResponse.json(
        { error: parentError.message },
        { status: 500 },
      );
    }

    if (!parentComment || parentComment.pre_read_id !== id) {
      return NextResponse.json(
        { error: "Parent comment not found for this Pre-Read" },
        { status: 400 },
      );
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, username, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const { data, error } = await supabase
    .from("pre_read_comments")
    .insert({
      pre_read_id: id,
      user_id: session.user.id,
      content,
      parent_id: parentId,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 500 },
    );
  }

  const profileMap = buildProfileMap(profile ? [profile] : []);

  return NextResponse.json(
    mapComment(data, session.user.id, isAdmin, profileMap),
    {
      status: 201,
    },
  );
}
