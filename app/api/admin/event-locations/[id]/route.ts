import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  deleteEventLocation,
  normalizeLocationInput,
  updateEventLocation,
} from "@/lib/church-events/locations";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const { id } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const input = normalizeLocationInput(body);
    const location = await updateEventLocation(supabase, id, input);
    return NextResponse.json({ location });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update location";
    const status = message === "Location not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const supabase = await createClient();

  try {
    await deleteEventLocation(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete location",
      },
      { status: 400 },
    );
  }
}
