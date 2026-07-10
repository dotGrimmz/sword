/** Primary dashboard routes shown in bottom nav and Today quick actions. */
export const dashboardScreens = {
  home: {
    id: "home",
    label: "Today",
    route: "/dashboard",
  },
  reader: {
    id: "reader",
    label: "Scripture",
    route: "/dashboard/reader",
  },
  notes: {
    id: "notes",
    label: "Reflections",
    route: "/dashboard/notes",
  },
  highlights: {
    id: "highlights",
    label: "Marked",
    route: "/dashboard/highlights",
  },
  settings: {
    id: "settings",
    label: "Profile",
    route: "/dashboard/settings",
  },
} as const;

export type DashboardScreenKey = keyof typeof dashboardScreens;

/** Routes reachable from Today but not in bottom nav. */
export const dashboardSecondaryScreens = {
  "pre-read": {
    id: "pre-read",
    label: "Pre-Read",
    route: "/pre-read",
  },
} as const;

export type SecondaryScreenKey = keyof typeof dashboardSecondaryScreens;

export const screenRoutes = {
  home: "/dashboard",
  reader: "/dashboard/reader",
  notes: "/dashboard/notes",
  highlights: "/dashboard/highlights",
  settings: "/dashboard/settings",
  "pre-read": "/pre-read",
  /** Deprecated — redirects to Today. */
  memory: "/dashboard",
  /** Deprecated — removed from IA. */
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
