import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const orderForEntry = (entry: Record<string, unknown>) => {
  const keys = ["order", "order_index", "position", "sort_order", "rank"];

  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "number") {
      return value;
    }
  }

  return 0;
};

const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("path_topics")
    .select("*, topics(*)")
    .eq("path_id", params.id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  const sorted = Array.isArray(data)
    ? [...data].sort(
        (a, b) =>
          orderForEntry(a as Record<string, unknown>) -
          orderForEntry(b as Record<string, unknown>)
      )
    : [];

  return NextResponse.json(sorted);
}
