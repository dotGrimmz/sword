"use client";

import { useQuery } from "@tanstack/react-query";

import { listPublishedQuizzes } from "@/lib/api/quizzes";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

export const usePublishedQuizzesQuery = () =>
  useQuery({
    queryKey: queryKeys.quizzesPublished(),
    queryFn: async () => {
      const { quizzes } = await listPublishedQuizzes();
      return quizzes;
    },
    staleTime: STALE_TIMES.profile,
  });
