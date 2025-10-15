import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const TOPIC_SELECT = `
  *,
  evidence(*),
  counters(*),
  topic_sources(*, sources(*))
`;

const errorStatusFromCode = (code?: string) =>
  code === "PGRST116" ? 404 : 500;

type AdditionalObjection = {
  objection?: unknown;
  claim?: unknown;
  summary?: unknown;
};

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("topics").select(TOPIC_SELECT);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof rawPayload !== "object" || rawPayload === null) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { objections, ...topicPayload } = rawPayload as Record<string, unknown>;

  const supabase = await createClient();

  const { data: topic, error } = await supabase
    .from("topics")
    .insert(topicPayload)
    .select(TOPIC_SELECT)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  if (!topic?.id) {
    return NextResponse.json({ error: "Topic creation failed" }, { status: 500 });
  }

  const additionalObjections: AdditionalObjection[] = Array.isArray(objections)
    ? objections
    : [];

  const formattedCounters = additionalObjections
    .map((entry) => (typeof entry === "object" && entry !== null ? entry : null))
    .filter((entry): entry is AdditionalObjection => entry !== null)
    .map((entry) => {
      const objectionText =
        typeof entry.objection === "string" ? entry.objection.trim() : "";
      const summaryText =
        typeof entry.summary === "string" ? entry.summary.trim() : "";
      const claimText =
        typeof entry.claim === "string" ? entry.claim.trim() : "";

      const rebuttalText = summaryText || claimText;

      return {
        topic_id: topic.id,
        objection: objectionText || null,
        rebuttal: rebuttalText || null,
      };
    })
    .filter((entry) => entry.objection || entry.rebuttal);

  if (formattedCounters.length > 0) {
    const { error: counterError } = await supabase
      .from("counters")
      .insert(formattedCounters)
      .select("id");

    if (counterError) {
      return NextResponse.json(
        { error: counterError.message },
        { status: errorStatusFromCode(counterError.code) }
      );
    }
  }

  return NextResponse.json({ topic }, { status: 201 });
}

export async function PUT(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, objections, ...updates } = payload;

  if (!id) {
    return NextResponse.json(
      { error: "Missing id in request body" },
      { status: 400 }
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields provided to update" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .update(updates)
    .eq("id", id)
    .select(TOPIC_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: errorStatusFromCode(error.code) }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (Array.isArray(objections)) {
    const formattedCounters = objections
      .map((entry) =>
        typeof entry === "object" && entry !== null
          ? (entry as AdditionalObjection)
          : null,
      )
      .filter((entry): entry is AdditionalObjection => entry !== null)
      .map((entry) => {
        const objectionText =
          typeof entry.objection === "string" ? entry.objection.trim() : "";
        const summaryText =
          typeof entry.summary === "string" ? entry.summary.trim() : "";
        const claimText =
          typeof entry.claim === "string" ? entry.claim.trim() : "";

        const rebuttalText = summaryText || claimText;

        return {
          topic_id: id,
          objection: objectionText || null,
          rebuttal: rebuttalText || null,
        };
      });

    const { error: deleteError } = await supabase
      .from("counters")
      .delete()
      .eq("topic_id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: errorStatusFromCode(deleteError.code) }
      );
    }

    if (formattedCounters.length > 0) {
      const { error: insertError } = await supabase
        .from("counters")
        .insert(formattedCounters)
        .select("id");

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: errorStatusFromCode(insertError.code) }
        );
      }
    }

    const { data: refreshed, error: refreshError } = await supabase
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("id", id)
      .single();

    if (refreshError) {
      return NextResponse.json(
        { error: refreshError.message },
        { status: errorStatusFromCode(refreshError.code) }
      );
    }

    return NextResponse.json(refreshed ?? data);
  }

  return NextResponse.json(data);
}
