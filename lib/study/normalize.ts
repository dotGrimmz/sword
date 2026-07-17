import { normalizeStudyMaterial } from "@/lib/study/materials/strategy";
import type { StudyMaterial, WeeklyStudy } from "@/types/study";

export const PRE_READ_SELECT = `
  *,
  host_profile:profiles!pre_reads_host_profile_id_fkey (
    id,
    username,
    avatar_url,
    stream_tagline,
    stream_url,
    is_host_active,
    role
  )
`;

export function normalizeWeeklyStudy(row: Record<string, unknown>): WeeklyStudy {
  const materialsRaw = row.materials;
  let materials: StudyMaterial[] | undefined;
  if (Array.isArray(materialsRaw)) {
    materials = materialsRaw.map((item) =>
      normalizeStudyMaterial(item as Record<string, unknown>),
    );
  }

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    week_start: String(row.week_start ?? ""),
    book: String(row.book),
    chapter: Number(row.chapter),
    verses_range: (row.verses_range as string | null) ?? null,
    summary: String(row.summary ?? ""),
    memory_verse: (row.memory_verse as string | null) ?? null,
    reflection_questions: Array.isArray(row.reflection_questions)
      ? (row.reflection_questions as string[])
      : null,
    poll_question: (row.poll_question as string | null) ?? null,
    poll_options: Array.isArray(row.poll_options)
      ? (row.poll_options as string[])
      : null,
    published: Boolean(row.published),
    is_cancelled: Boolean(row.is_cancelled),
    materials,
  };
}
