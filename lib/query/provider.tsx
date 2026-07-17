"use client";

import type { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query/get-query-client";

export function AppQueryProvider({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
