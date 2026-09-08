/**
 * Build identity is injected by Vite at build time. Keep parsing here so the
 * UI can expose a friendly package version while diagnostics retain the full
 * revision/build identity.
 */
export interface BuildInfo {
  version: string;
  buildIdentity: string;
}

export const FALLBACK_APP_VERSION = "0.1.0";

function injectedBuildIdentity(): string | undefined {
  return typeof __APP_BUILD__ === "string" && __APP_BUILD__.trim() ? __APP_BUILD__.trim() : undefined;
}

export function parseBuildIdentity(identity: string | undefined, fallbackVersion = FALLBACK_APP_VERSION): BuildInfo {
  const fallback = fallbackVersion.trim() || FALLBACK_APP_VERSION;
  const value = identity?.trim();
  if (!value) {
    return { version: fallback, buildIdentity: fallback };
  }

  // Vite currently emits `${packageVersion}+${gitRevision}.${buildId}`. Keep
  // the parser tolerant of prerelease versions and future build suffixes.
  const separator = value.indexOf("+");
  const version = (separator > 0 ? value.slice(0, separator) : value).trim() || fallback;
  return { version, buildIdentity: value };
}

export function formatFriendlyVersion(version: string): string {
  const value = version.trim() || FALLBACK_APP_VERSION;
  return value.startsWith("v") ? value : `v${value}`;
}

export const BUILD_INFO = parseBuildIdentity(injectedBuildIdentity());
