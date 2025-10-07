import { getAccessToken } from "./session";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const mergeHeaders = (
  base: HeadersInit | undefined,
  extra: HeadersInit
): HeadersInit => {
  const result = new Headers(base);
  new Headers(extra).forEach((value, key) => {
    result.set(key, value);
  });
  return result;
};

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();

  const requestInit: RequestInit = {
    cache: "no-store",
    ...init,
    headers: mergeHeaders(init?.headers, {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
  };

  const response = await fetch(input, requestInit);

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    let data: unknown = null;

    try {
      data = await response.json();
      if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
        const errorMessage = (data as { error?: unknown }).error;
        if (typeof errorMessage === "string" && errorMessage.length > 0) {
          message = errorMessage;
        }
      }
    } catch {
      // ignore json parsing errors
    }

    throw new ApiError(message, response.status, data);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
