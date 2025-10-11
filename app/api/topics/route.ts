//@ts-ignore
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { data, error } = await supabase
    .from("topics")
    .select(
      `
      *,
      evidence (*, evidence_scriptures(*)),
      counters (*, counter_sources(*)),
      topic_sources (*, sources(*)),
      topic_scriptures (*, scriptures(*))
    `
    )
    .eq("id", params.id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
