import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import { fetchAdminUsers } from "@/lib/admin/users";

export async function GET() {
  const auth = await requireAdminOnly();
  if (auth.error) {
    return auth.error;
  }

  try {
    const users = await fetchAdminUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load users",
      },
      { status: 500 },
    );
  }
}
