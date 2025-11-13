import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const AVATAR_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET ?? "profile-photos";
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/$/,
  "",
);
const PUBLIC_STORAGE_PREFIX = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/`
  : null;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

const isSupportedImageType = (mime: string) =>
  ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mime);

const getExtension = (file: File) => {
  const parts = (file.name ?? "").split(".");
  const ext = parts.length > 1 ? parts.pop() : null;
  if (ext) {
    return ext.toLowerCase();
  }
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
};

const extractStoragePath = (publicUrl: string | null | undefined) => {
  if (!publicUrl || !PUBLIC_STORAGE_PREFIX) {
    return null;
  }
  if (!publicUrl.startsWith(PUBLIC_STORAGE_PREFIX)) {
    return null;
  }
  const relativePath = publicUrl.slice(PUBLIC_STORAGE_PREFIX.length);
  const firstSlash = relativePath.indexOf("/");
  if (firstSlash === -1) {
    return null;
  }
  const bucket = relativePath.slice(0, firstSlash);
  if (bucket !== AVATAR_BUCKET) {
    return null;
  }
  const objectPath = relativePath.slice(firstSlash + 1);
  return objectPath.length > 0 ? objectPath : null;
};

const deleteAvatarFromStorage = async (supabase: Awaited<ReturnType<typeof createClient>>, url?: string | null) => {
  const storagePath = extractStoragePath(url ?? null);
  if (!storagePath) {
    return;
  }
  try {
    await supabase.storage.from(AVATAR_BUCKET).remove([storagePath]);
  } catch (error) {
    console.error("Failed to remove previous avatar", error);
  }
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");
    if (candidate instanceof File) {
      file = candidate;
    }
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return NextResponse.json(
      { error: "Avatar must be 5 MB or less." },
      { status: 400 },
    );
  }

  if (!file.type || !isSupportedImageType(file.type)) {
    return NextResponse.json(
      { error: "Unsupported image type. Please upload PNG, JPG, GIF, or WebP." },
      { status: 400 },
    );
  }

  const { data: currentProfile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  const fileExt = getExtension(file);
  const filePath = `${session.user.id}/${randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", session.user.id)
    .select(
      "id, username, avatar_url, stream_tagline, stream_url, role",
    )
    .maybeSingle();

  if (updateError || !updatedProfile) {
    return NextResponse.json(
      { error: updateError?.message ?? "Unable to update profile." },
      { status: updateError?.code === "42501" ? 403 : 500 },
    );
  }

  if (currentProfile?.avatar_url) {
    await deleteAvatarFromStorage(supabase, currentProfile.avatar_url);
  }

  return NextResponse.json({
    avatar_url: updatedProfile.avatar_url,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 },
    );
  }

  if (profile?.avatar_url) {
    await deleteAvatarFromStorage(supabase, profile.avatar_url);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", session.user.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: updateError.code === "42501" ? 403 : 500 },
    );
  }

  return NextResponse.json({ avatar_url: null });
}
