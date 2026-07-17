import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  deleteSeries,
  getAdminSeries,
  updateSeries,
} from "@/lib/church-events/loaders";
import { normalizeSeriesInput } from "@/lib/church-events/normalize";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Series id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const series = await getAdminSeries(supabase, id);
    if (!series) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ series });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load event",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Series id is required" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    const input = normalizeSeriesInput(body);
    const series = await updateSeries(supabase, id, input);
    return NextResponse.json({ series });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update event";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Series id is required" }, { status: 400 });
  }

  const supabase = await createClient();
  try {
    await deleteSeries(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete event",
      },
      { status: 500 },
    );
  }
}
