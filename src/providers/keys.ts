/**
 * BYOK key handling (ADR-012, docs/BYOK_SECURITY.md):
 * - memory-only by default (cleared on reload/tab close)
 * - optional sessionStorage after explicit opt-in ("remember for this tab")
 * - never localStorage, IndexedDB, exports, logs, or Cache Storage
 */

const SESSION_PREFIX = "idp:apikey:";

const memoryKeys = new Map<string, string>();

function sessionStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage !== undefined;
  } catch {
    return false;
  }
}

export interface KeyStoreOptions {
  /** Opt-in persistence for the current tab only. */
  rememberForTab: boolean;
}

export function setApiKey(providerConfigId: string, apiKey: string, options: KeyStoreOptions): void {
  memoryKeys.set(providerConfigId, apiKey);
  if (sessionStorageAvailable()) {
    if (options.rememberForTab) {
      window.sessionStorage.setItem(SESSION_PREFIX + providerConfigId, apiKey);
    } else {
      window.sessionStorage.removeItem(SESSION_PREFIX + providerConfigId);
    }
  }
}

export function getApiKey(providerConfigId: string): string | undefined {
  const memory = memoryKeys.get(providerConfigId);
  if (memory !== undefined) {
    return memory;
  }
  if (sessionStorageAvailable()) {
    return window.sessionStorage.getItem(SESSION_PREFIX + providerConfigId) ?? undefined;
  }
  return undefined;
}

export function isKeyRememberedForTab(providerConfigId: string): boolean {
  if (!sessionStorageAvailable()) {
    return false;
  }
  return window.sessionStorage.getItem(SESSION_PREFIX + providerConfigId) !== null;
}

export function clearApiKey(providerConfigId: string): void {
  memoryKeys.delete(providerConfigId);
  if (sessionStorageAvailable()) {
    window.sessionStorage.removeItem(SESSION_PREFIX + providerConfigId);
  }
}

export function clearAllKeys(): void {
  memoryKeys.clear();
  if (sessionStorageAvailable()) {
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(SESSION_PREFIX)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      window.sessionStorage.removeItem(key);
    }
  }
}

/** Keys never reach IndexedDB or localStorage: these are hard assertions in tests. */
export function assertNoKeyLeakage(): void {
  // Nothing to do at runtime; kept as the documented contract surface.
  void memoryKeys;
}
