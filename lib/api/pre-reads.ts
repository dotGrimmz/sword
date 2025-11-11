import { headers } from "next/headers";
import { notFound } from "next/navigation";

import type { HostProfile, PreRead } from "@/types/pre-read";

const buildRequestInit = async (): Promise<RequestInit> => {
  const headerStore = headers();
  const resolvedHeaders =
    headerStore instanceof Promise ? await headerStore : headerStore;

  const cookie = resolvedHeaders.get("cookie");

  return {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
  };
};

const ensureLeadingSlash = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const getBaseUrl = async () => {
  const headerStore = headers();
  const resolvedHeaders =
    headerStore instanceof Promise ? await headerStore : headerStore;

  const host =
    resolvedHeaders.get("x-forwarded-host") ??
    resolvedHeaders.get("host") ??
    "";

  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }

  const protocol =
    resolvedHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
};

const buildUrl = async (path: string) => {
  const base = await getBaseUrl();
  return new URL(ensureLeadingSlash(path), base).toString();
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(await buildUrl(path), await buildRequestInit());

  if (!response.ok) {
    let message = `Failed to fetch ${path}`;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // no-op
    }

    const error = new Error(message);
    // @ts-expect-error augment error shape for upstream callers
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export async function fetchPreReads(): Promise<PreRead[]> {
  return fetchJson<PreRead[]>("/api/pre-reads");
}

export async function fetchPreRead(id: string): Promise<PreRead> {
  try {
    return await fetchJson<PreRead>(`/api/pre-reads/${id}`);
  } catch (error) {
    if (
      error instanceof Error &&
      // @ts-expect-error status may have been attached above
      (error.status === 404 || error.message.toLowerCase().includes("not found"))
    ) {
      notFound();
    }
    throw error;
  }
}

export async function fetchHostProfiles(options?: {
  activeOnly?: boolean;
}): Promise<HostProfile[]> {
  const query = options?.activeOnly ? "?activeOnly=true" : "";
  return fetchJson<HostProfile[]>(`/api/hosts${query}`);
}
