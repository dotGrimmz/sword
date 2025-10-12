export const screenRoutes = {
  home: "/dashboard",
  reader: "/dashboard/reader",
  highlights: "/dashboard/highlights",
  memory: "/dashboard/memory",
  notes: "/dashboard/notes",
  settings: "/dashboard/settings",
  apologetics: "/apologetics",
} as const;

export type ScreenKey = keyof typeof screenRoutes;

export function getRouteForScreen(screen: string): string {
  if (screen in screenRoutes) {
    return screenRoutes[screen as ScreenKey];
  }

  return screenRoutes.home;
}

export function getScreenForPath(pathname: string): ScreenKey {
  const normalized = normalizePathname(pathname);

  for (const [screen, route] of Object.entries(screenRoutes)) {
    if (route === normalized) {
      return screen as ScreenKey;
    }
  }

  return "home";
}

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return "/dashboard";
  }

  if (pathname.endsWith("/") && pathname.length > 1) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
