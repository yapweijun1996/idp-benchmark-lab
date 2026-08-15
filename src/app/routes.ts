export type RouteId =
  | "dashboard"
  | "documents"
  | "profiles"
  | "golden"
  | "providers"
  | "benchmarks"
  | "compare"
  | "settings";

export interface RouteDef {
  id: RouteId;
  label: string;
  path: string;
}

/** Sidebar order is also the tab order for keyboard users. */
export const ROUTES: readonly RouteDef[] = [
  { id: "dashboard", label: "Dashboard", path: "#/dashboard" },
  { id: "documents", label: "Documents", path: "#/documents" },
  { id: "profiles", label: "Extraction Profiles", path: "#/profiles" },
  { id: "golden", label: "Golden Answers", path: "#/golden" },
  { id: "providers", label: "Providers", path: "#/providers" },
  { id: "benchmarks", label: "Benchmarks", path: "#/benchmarks" },
  { id: "compare", label: "Compare", path: "#/compare" },
  { id: "settings", label: "Settings", path: "#/settings" },
];

export const DEFAULT_ROUTE: RouteId = "dashboard";

/** Maps a raw location hash to a known route; unknown hashes fall back to the dashboard. */
export function parseHash(hash: string): RouteId {
  const found = ROUTES.find((r) => r.path === hash);
  return found ? found.id : DEFAULT_ROUTE;
}
