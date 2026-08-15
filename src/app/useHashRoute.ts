import { useEffect, useState } from "react";
import { DEFAULT_ROUTE, parseHash, type RouteId } from "./routes";

/**
 * Minimal hash-based router for GitHub Pages (no server rewrites needed).
 * Unknown hashes resolve to the default route instead of an error page.
 */
export function useHashRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() =>
    typeof window === "undefined" ? DEFAULT_ROUTE : parseHash(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}
