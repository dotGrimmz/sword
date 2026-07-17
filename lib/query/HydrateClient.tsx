"use client";

import {
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

export function HydrateClient({
  state,
  children,
}: PropsWithChildren<{ state: DehydratedState }>) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
