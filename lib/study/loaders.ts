import { normalizeStudyMaterial } from "@/lib/study/materials/strategy";
import { PRE_READ_SELECT, normalizeWeeklyStudy } from "@/lib/study/normalize";
import { startOfWeek } from "@/lib/study/week";
import type { SupabaseDbClient } from "@/lib/bible/queries";
import type { StudyMaterial, WeeklyStudy } from "@/types/study";

export class LoaderError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "LoaderError";
    this.code = code;
  }
}

/** Current published study for this week, or null. */
export async function fetchCurrentStudy(
  client: SupabaseDbClient,
  now: Date = new Date(),
): Promise<WeeklyStudy | null> {
  const weekStart = startOfWeek(now);
  const { data, error } = await client
    .from("pre_reads")
    .select(PRE_READ_SELECT)
    .eq("published", true)
    .eq("is_cancelled", false)
    .eq("week_start", weekStart)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new LoaderError(error.message, error.code);
  }

  if (!data) {
    return null;
  }

  return normalizeWeeklyStudy(data as unknown as Record<string, unknown>);
}

/** Materials for a pre-read / study, ordered for display. */
export async function fetchStudyMaterials(
  client: SupabaseDbClient,
  studyId: string,
): Promise<StudyMaterial[]> {
  const { data, error } = await client
    .from("study_materials")
    .select("*")
    .eq("pre_read_id", studyId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new LoaderError(error.message, error.code);
  }

  return (data ?? []).map((row) =>
    normalizeStudyMaterial(row as unknown as Record<string, unknown>),
  );
}
