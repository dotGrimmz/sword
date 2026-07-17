"use client";

import { useQuery } from "@tanstack/react-query";

import { getNextHomeEvent } from "@/lib/api/events";
import { queryKeys, STALE_TIMES } from "@/lib/query/keys";

export const useHomeEventQuery = () =>
  useQuery({
    queryKey: queryKeys.homeEvent(),
    queryFn: async () => {
      const { event } = await getNextHomeEvent();
      return event;
    },
    staleTime: STALE_TIMES.profile,
  });
