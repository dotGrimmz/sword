import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import { createSeries, listAdminSeries } from "@/lib/church-events/loaders";
import { normalizeSeriesInput } from "@/lib/church-events/normalize";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const supabase = await createClient();
  try {
    const series = await listAdminSeries(supabase);
    return NextResponse.json({ series });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load events",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    const input = normalizeSeriesInput(body);
    const series = await createSeries(supabase, input, auth.user.id);
    return NextResponse.json({ series }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create event",
      },
      { status: 400 },
    );
  }
}
