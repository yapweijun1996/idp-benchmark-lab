export type RouteId = "home" | "new-benchmark" | "runs" | "compare" | "library" | "settings";

export interface RouteDef {
  id: RouteId;
  label: string;
  path: string;
}

/** Sidebar order is also the tab order for keyboard users. */
export const ROUTES: readonly RouteDef[] = [
  { id: "home", label: "Home", path: "#/home" },
  { id: "new-benchmark", label: "New Benchmark", path: "#/new-benchmark" },
  { id: "runs", label: "Runs & Results", path: "#/runs" },
  { id: "compare", label: "Compare", path: "#/compare" },
  { id: "library", label: "Library", path: "#/library" },
  { id: "settings", label: "Settings", path: "#/settings" },
];

export const DEFAULT_ROUTE: RouteId = "home";

/**
 * Pre-redesign hashes still resolve so old bookmarks/links keep working.
 * Maps entity-first routes onto the task-oriented navigation they now live under.
 */
const LEGACY_REDIRECTS: Readonly<Record<string, RouteId>> = {
  "#/dashboard": "home",
  "#/documents": "library",
  "#/profiles": "library",
  "#/golden": "library",
  "#/providers": "settings",
  "#/benchmarks": "new-benchmark",
};

/** Maps a raw location hash to a known route; unknown hashes fall back to home. */
export function parseHash(hash: string): RouteId {
  const found = ROUTES.find((r) => r.path === hash);
  if (found) {
    return found.id;
  }
  return LEGACY_REDIRECTS[hash] ?? DEFAULT_ROUTE;
}
