import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import { cancelOccurrence } from "@/lib/church-events/loaders";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { error: "Occurrence id is required" },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status !== "cancelled") {
    return NextResponse.json(
      { error: "Only status=cancelled is supported in v1" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  try {
    const occurrence = await cancelOccurrence(supabase, id);
    return NextResponse.json({ occurrence });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to cancel occurrence";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
