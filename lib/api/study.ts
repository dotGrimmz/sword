import { apiFetch } from "@/lib/api/fetch";
import type { StudyMaterial, WeeklyStudy } from "@/types/study";

export const getCurrentStudy = async (): Promise<WeeklyStudy | null> => {
  return apiFetch<WeeklyStudy | null>("/api/pre-reads?current=1");
};

export const listStudyMaterials = async (
  studyId: string,
): Promise<StudyMaterial[]> => {
  return apiFetch<StudyMaterial[]>(`/api/pre-reads/${studyId}/materials`);
};

export const createStudyLinkMaterial = async (
  studyId: string,
  input: { title: string; url: string; sortOrder?: number },
): Promise<StudyMaterial> => {
  return apiFetch<StudyMaterial>(`/api/pre-reads/${studyId}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "link",
      title: input.title,
      url: input.url,
      sort_order: input.sortOrder ?? 0,
    }),
  });
};

export const uploadStudyFileMaterial = async (
  studyId: string,
  file: File,
  title?: string,
): Promise<StudyMaterial> => {
  const formData = new FormData();
  formData.append("file", file, file.name);
  if (title?.trim()) {
    formData.append("title", title.trim());
  }
  return apiFetch<StudyMaterial>(
    `/api/pre-reads/${studyId}/materials/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
};

export const deleteStudyMaterial = async (
  studyId: string,
  materialId: string,
): Promise<void> => {
  await apiFetch(`/api/pre-reads/${studyId}/materials/${materialId}`, {
    method: "DELETE",
  });
};
