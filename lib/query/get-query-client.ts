import { QueryClient, isServer } from "@tanstack/react-query";

import { STALE_TIMES } from "@/lib/query/keys";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.user,
        gcTime: 1000 * 60 * 30,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** Per-request on the server; singleton in the browser. */
export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
