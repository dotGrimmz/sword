import { NextResponse } from "next/server";

import { getPublicSeries } from "@/lib/church-events/loaders";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Series id is required" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    const series = await getPublicSeries(supabase, id);
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
