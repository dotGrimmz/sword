import { createClient } from "@/lib/supabase/client";

let cachedAccessToken: string | null = null;
let accessTokenPromise: Promise<string | null> | null = null;
let supabaseClient: ReturnType<typeof createClient> | null = null;

const ensureSupabaseClient = () => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient();

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      cachedAccessToken = session?.access_token ?? null;
    });
  }

  return supabaseClient;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  if (cachedAccessToken !== null) {
    return cachedAccessToken;
  }

  if (!accessTokenPromise) {
    const client = ensureSupabaseClient();

    if (!client) {
      return null;
    }

    accessTokenPromise = client.auth
      .getSession()
      .then(({ data }) => {
        cachedAccessToken = data.session?.access_token ?? null;
        return cachedAccessToken;
      })
      .finally(() => {
        accessTokenPromise = null;
      });
  }

  return accessTokenPromise;
};

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
};
