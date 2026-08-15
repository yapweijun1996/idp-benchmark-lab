import type { ProviderError } from "./types";

const FENCED_RE = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/i;

/**
 * Conservative JSON extraction (no silent normalization): try the whole
 * trimmed text first, then a single fenced code block. Returns undefined
 * when nothing parses — parse failures are explicit run states.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to fenced extraction
  }
  const fenced = FENCED_RE.exec(trimmed);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const STATUS_CATEGORY: Record<number, ProviderError["category"]> = {
  400: "invalid_request",
  401: "auth",
  403: "auth",
  404: "invalid_request",
  408: "network",
  409: "provider",
  413: "invalid_request",
  422: "invalid_request",
  429: "rate_limit",
};

export function errorFromStatus(status: number, bodyText: string): ProviderError {
  const category = STATUS_CATEGORY[status] ?? (status >= 500 ? "provider" : "unknown");
  return {
    category,
    message: bodyText.slice(0, 300) || `HTTP ${status}`,
    status,
    retryable: category === "rate_limit" || category === "network" || (category === "provider" && status >= 500),
  };
}

/** Network-layer failures (fetch TypeError). CORS and offline both surface here. */
export function networkError(detail: string): ProviderError {
  return {
    category: "network",
    message: `Network/CORS failure: ${detail}. In the browser, CORS blocks and offline states both appear as fetch failures; check the provider's CORS policy for custom endpoints.`,
    retryable: true,
  };
}

export interface FetchResult {
  ok: boolean;
  status: number;
  text: string;
  json: unknown;
}

/**
 * fetch + text/json capture. Network failures are normalized; AbortError
 * propagates untouched so the runner can mark the run cancelled.
 */
export async function fetchJson(url: string, init: RequestInit, signal?: AbortSignal): Promise<FetchResult> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw e;
    }
    throw networkError(e instanceof Error ? e.message : String(e));
  }
  const text = await response.text().catch(() => "");
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { ok: response.ok, status: response.status, text, json };
}

/** One-line text from an unknown provider error body, without key material. */
export function bodyText(body: unknown): string {
  if (typeof body === "string") {
    return body;
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.error === "string") {
      return record.error;
    }
    if (record.error && typeof record.error === "object") {
      const err = record.error as Record<string, unknown>;
      if (typeof err.message === "string") {
        return err.message;
      }
    }
    if (typeof record.message === "string") {
      return record.message;
    }
  }
  return "";
}
