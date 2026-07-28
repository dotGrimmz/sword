import { NextResponse } from "next/server";

import { requireAdminOnly } from "@/lib/admin/auth";
import {
  createEventLocation,
  listEventLocations,
  normalizeLocationInput,
} from "@/lib/church-events/locations";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireAdminOnly();
  if (auth.error) return auth.error;

  const supabase = await createClient();
  try {
    const locations = await listEventLocations(supabase);
    return NextResponse.json({ locations });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load locations",
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
    const input = normalizeLocationInput(body);
    const location = await createEventLocation(supabase, input);
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create location",
      },
      { status: 400 },
    );
  }
}
