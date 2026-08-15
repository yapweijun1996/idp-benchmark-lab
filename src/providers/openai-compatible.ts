import { bodyText, errorFromStatus, extractJson, fetchJson } from "./common";
import type {
  NormalizedExtractionRequest,
  NormalizedExtractionResponse,
  ProviderAdapter,
  ProviderCapabilities,
  ProviderContext,
  ProviderError,
} from "./types";

interface CustomSettings {
  customHeaders?: Record<string, string>;
  useJsonObject?: boolean;
  capabilityOverrides?: Partial<ProviderCapabilities>;
}

function settingsOf(ctx: ProviderContext): CustomSettings {
  return (ctx.config.settings ?? {}) as CustomSettings;
}

function invalidRequest(message: string): ProviderError {
  return { category: "invalid_request", message, retryable: false };
}

function baseUrlOf(ctx: ProviderContext): string {
  const base = ctx.config.baseUrl?.trim().replace(/\/+$/, "");
  if (!base) {
    throw invalidRequest("Custom provider requires a base URL (e.g. https://api.example.com/v1).");
  }
  if (!/^https?:\/\//i.test(base)) {
    throw invalidRequest("Custom provider base URL must start with http(s)://");
  }
  return base;
}

/** OpenAI-compatible chat/completions (ADR-009); CORS must be allowed by the endpoint. */
export const customAdapter: ProviderAdapter = {
  kind: "openai_compatible",

  capabilities(config) {
    const overrides = (config.settings?.capabilityOverrides ?? {}) as Partial<ProviderCapabilities>;
    return {
      nativePdf: false,
      imageInput: true,
      structuredOutput: true,
      tokenUsage: true,
      providerReportedCost: false,
      temperature: true,
      thinking: false,
      ...overrides,
    };
  },

  async testConnection(ctx: ProviderContext) {
    const base = baseUrlOf(ctx);
    const headers = buildHeaders(ctx);
    try {
      const result = await fetchJson(`${base}/models`, { method: "GET", headers }, ctx.signal);
      if (result.ok) {
        return { ok: true, message: "Custom endpoint reachable; API key accepted." };
      }
      if (result.status === 404 || result.status === 405) {
        return {
          ok: false,
          message: "Endpoint responded but has no /models route; verify the base URL and CORS policy.",
          error: errorFromStatus(result.status, bodyText(result.json) || result.text),
        };
      }
      return {
        ok: false,
        message: "Custom endpoint connection failed",
        error: errorFromStatus(result.status, bodyText(result.json) || result.text),
      };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw e;
      }
      const err = e as ProviderError;
      return { ok: false, message: "Custom endpoint connection failed", error: err };
    }
  },

  async extract(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse> {
    const base = baseUrlOf(ctx);
    const s = settingsOf(ctx);
    if (request.mode !== "canonical_images") {
      throw invalidRequest("The OpenAI-compatible adapter accepts canonical rendered images only.");
    }
    if (!request.images || request.images.length === 0) {
      throw invalidRequest("No page images were supplied for canonical_images mode.");
    }
    const content = [
      { type: "text", text: request.prompt },
      ...request.images.map((image) => ({
        type: "image_url",
        image_url: { url: image.dataUrl },
      })),
    ];
    const body: Record<string, unknown> = {
      model: ctx.config.model,
      messages: [{ role: "user", content }],
    };
    if (s.useJsonObject !== false) {
      body.response_format = { type: "json_object" };
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    const result = await fetchJson(
      `${base}/chat/completions`,
      {
        method: "POST",
        headers: { ...buildHeaders(ctx), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      ctx.signal,
    );
    if (!result.ok) {
      throw errorFromStatus(result.status, bodyText(result.json) || result.text);
    }

    const data = (result.json ?? {}) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const contentText = data.choices?.[0]?.message?.content;
    if (typeof contentText !== "string" || contentText.length === 0) {
      throw { category: "provider", message: "Endpoint response contained no text content", retryable: false } satisfies ProviderError;
    }
    const json = extractJson(contentText);
    if (json === undefined) {
      throw { category: "provider", message: "Endpoint response text was not parseable JSON", retryable: false } satisfies ProviderError;
    }
    const usage = data.usage;
    return {
      raw: contentText,
      json,
      usage: usage
        ? { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, totalTokens: usage.total_tokens }
        : undefined,
      providerCalls: 1,
    };
  },
};

function buildHeaders(ctx: ProviderContext): Record<string, string> {
  const s = settingsOf(ctx);
  return {
    Authorization: `Bearer ${ctx.apiKey}`,
    ...s.customHeaders,
  };
}
