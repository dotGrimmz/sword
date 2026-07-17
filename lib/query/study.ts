"use client";

import { useQuery } from "@tanstack/react-query";

import { getCurrentStudy, listStudyMaterials } from "@/lib/api/study";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

export const useCurrentStudyQuery = () =>
  useQuery({
    queryKey: queryKeys.studyCurrent(),
    queryFn: getCurrentStudy,
    staleTime: STALE_TIMES.profile,
  });

export const useStudyMaterialsQuery = (studyId: string | null | undefined) =>
  useQuery({
    queryKey: queryKeys.studyMaterials(studyId ?? "none"),
    queryFn: () => listStudyMaterials(studyId!),
    staleTime: STALE_TIMES.profile,
    enabled: Boolean(studyId),
  });
