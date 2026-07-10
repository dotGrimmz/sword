const LOCAL_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

/**
 * Resolve the app origin on the server (SSR, route handlers, emails).
 * Prefer explicit NEXT_PUBLIC_SITE_URL, then Vercel preview URL, then localhost.
 */
export function resolveSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const vercelUrl = process.env.VERCEL_URL?.replace(/\/$/, "");
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

/** Client-only origin for OAuth redirects — always matches the tab the user is on. */
export function resolveClientOrigin(): string {
  if (typeof window === "undefined") {
    return resolveSiteOrigin();
  }

  return window.location.origin;
}

export function buildAuthCallbackUrl(nextPath = "/dashboard"): string {
  const origin = resolveClientOrigin();
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Restrict post-auth redirects to same-origin relative paths. */
export function sanitizeAuthNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  return next;
}

export function isLocalOrigin(origin: string): boolean {
  return LOCAL_ORIGINS.has(origin.replace(/\/$/, ""));
}
