import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import { updateAdminUserTitle } from "@/lib/admin/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly();
  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "User id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!("title" in body)) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 },
    );
  }

  const title =
    body.title === null || body.title === undefined
      ? null
      : typeof body.title === "string"
        ? body.title
        : null;

  if (body.title !== null && typeof body.title !== "string") {
    return NextResponse.json(
      { error: "title must be a string or null" },
      { status: 400 },
    );
  }

  try {
    const user = await updateAdminUserTitle(id, title);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update user",
      },
      { status: 500 },
    );
  }
}
