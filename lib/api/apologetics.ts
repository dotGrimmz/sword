import { headers } from "next/headers";
import { notFound } from "next/navigation";

import type {
  Path,
  PathTopicLink,
  Source,
  Topic,
  TopicSourceLink,
} from "@/types/apologetics";

const requestInit: RequestInit = {
  cache: "no-store",
  headers: {
    "Content-Type": "application/json",
  },
};

const ensureLeadingSlash = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const getBaseUrl = () => {
  const headerStore = headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";

  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
};

const buildUrl = (path: string) => {
  const base = getBaseUrl();
  return new URL(ensureLeadingSlash(path), base).toString();
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), requestInit);

  if (!response.ok) {
    let message = `Failed to fetch ${path}`;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore JSON parse failure
    }

    const error = new Error(message);
    // @ts-expect-error augment error with status
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

export async function fetchTopics(): Promise<Topic[]> {
  return fetchJson<Topic[]>("/api/topics");
}

export async function fetchTopic(id: string): Promise<Topic> {
  try {
    return await fetchJson<Topic>(`/api/topics/${id}`);
  } catch (error) {
    if (
      error instanceof Error &&
      // @ts-expect-error status might be appended above
      (error.status === 404 || error.message.toLowerCase().includes("not found"))
    ) {
      notFound();
    }
    throw error;
  }
}

export async function fetchPaths(): Promise<Path[]> {
  return fetchJson<Path[]>("/api/paths");
}

export async function fetchSources(): Promise<Source[]> {
  return fetchJson<Source[]>("/api/sources");
}

export async function fetchPath(id: string): Promise<Path> {
  try {
    return await fetchJson<Path>(`/api/paths/${id}`);
  } catch (error) {
    if (
      error instanceof Error &&
      // @ts-expect-error status might be appended above
      (error.status === 404 || error.message.toLowerCase().includes("not found"))
    ) {
      notFound();
    }
    throw error;
  }
}

export const normalizeTags = (tags: Topic["tags"] | Path["tags"]) => {
  if (!tags) return [];

  if (Array.isArray(tags)) {
    return tags.filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

const ORDER_KEYS: Array<keyof PathTopicLink> = [
  "order",
  "order_index",
  "position",
  "sort_order",
  "rank",
];

export const sortPathTopics = (
  entries: PathTopicLink[] | null | undefined,
): PathTopicLink[] => {
  if (!entries) return [];

  return [...entries].sort((a, b) => {
    const aOrder = ORDER_KEYS.reduce<number | null>((value, key) => {
      if (value !== null) return value;
      const candidate = a[key];
      return typeof candidate === "number" ? candidate : null;
    }, null);

    const bOrder = ORDER_KEYS.reduce<number | null>((value, key) => {
      if (value !== null) return value;
      const candidate = b[key];
      return typeof candidate === "number" ? candidate : null;
    }, null);

    const fallbackA = aOrder ?? 0;
    const fallbackB = bOrder ?? 0;

    return fallbackA - fallbackB;
  });
};

export const extractTopicSources = (
  links: TopicSourceLink[] | null | undefined,
) => {
  if (!links) return [];
  return links
    .map((link) => link.sources)
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
};
