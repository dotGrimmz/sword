import { NextResponse } from "next/server";

import {
  getNextHomeEvent,
  listPastOccurrences,
  listUpcomingOccurrences,
} from "@/lib/church-events/loaders";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const supabase = await createClient();

  try {
    if (searchParams.get("home") === "1") {
      const event = await getNextHomeEvent(supabase);
      return NextResponse.json({ event });
    }

    if (searchParams.get("past") === "1") {
      const events = await listPastOccurrences(supabase);
      return NextResponse.json({ events });
    }

    const events = await listUpcomingOccurrences(supabase);
    return NextResponse.json({ events });
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
