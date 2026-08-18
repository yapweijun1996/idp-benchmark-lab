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
  apiStyle?: "chat_completions" | "responses";
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

/** OpenAI-compatible chat/completions or Responses API; CORS must be allowed by the endpoint. */
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
    const s = settingsOf(ctx);
    const headers = buildHeaders(ctx);
    try {
      const result =
        s.apiStyle === "responses"
          ? await fetchJson(
              `${base}/responses`,
              {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ model: ctx.config.model, input: "ping", stream: false }),
              },
              ctx.signal,
            )
          : await fetchJson(`${base}/models`, { method: "GET", headers }, ctx.signal);
      if (result.ok) {
        return {
          ok: true,
          message: s.apiStyle === "responses" ? "Custom Responses endpoint reachable; API key accepted." : "Custom endpoint reachable; API key accepted.",
        };
      }
      if (result.status === 404 || result.status === 405) {
        return {
          ok: false,
          message:
            s.apiStyle === "responses"
              ? "Endpoint responded but has no /responses route; verify the base URL and CORS policy."
              : "Endpoint responded but has no /models route; verify the base URL and CORS policy.",
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
    const isResponses = s.apiStyle === "responses";
    const body: Record<string, unknown> = isResponses
      ? {
          model: ctx.config.model,
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: request.prompt },
                ...request.images.map((image) => ({ type: "input_image", image_url: image.dataUrl })),
              ],
            },
          ],
          stream: false,
        }
      : {
          model: ctx.config.model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: request.prompt },
                ...request.images.map((image) => ({ type: "image_url", image_url: { url: image.dataUrl } })),
              ],
            },
          ],
        };

    if (!isResponses && s.useJsonObject !== false) {
      body.response_format = { type: "json_object" };
    }
    if (request.temperature !== undefined && !isResponses) {
      body.temperature = request.temperature;
    }
    if (request.thinking && isResponses) {
      body.reasoning = { effort: request.thinking };
    }

    const result = await fetchJson(`${base}/${isResponses ? "responses" : "chat/completions"}`, {
      method: "POST",
      headers: { ...buildHeaders(ctx), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, ctx.signal);
    if (!result.ok) {
      throw errorFromStatus(result.status, bodyText(result.json) || result.text);
    }

    const data = (result.json ?? {}) as Record<string, unknown>;
    const contentText = isResponses ? responseText(data) : chatCompletionText(data);
    if (typeof contentText !== "string" || contentText.length === 0) {
      throw { category: "provider", message: "Endpoint response contained no text content", retryable: false } satisfies ProviderError;
    }
    const json = extractJson(contentText);
    if (json === undefined) {
      throw { category: "provider", message: "Endpoint response text was not parseable JSON", retryable: false } satisfies ProviderError;
    }
    const usage = data.usage as
      | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; input_tokens?: number; output_tokens?: number }
      | undefined;
    return {
      raw: contentText,
      json,
      usage: usage
        ? {
            inputTokens: usage.input_tokens ?? usage.prompt_tokens,
            outputTokens: usage.output_tokens ?? usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      providerCalls: 1,
    };
  },
};

function chatCompletionText(data: Record<string, unknown>): unknown {
  const choices = data.choices;
  if (!Array.isArray(choices)) return undefined;
  const message = choices[0];
  if (!message || typeof message !== "object") return undefined;
  const content = (message as { message?: { content?: unknown } }).message?.content;
  return typeof content === "string" ? content : undefined;
}

function responseText(data: Record<string, unknown>): unknown {
  if (typeof data.output_text === "string") return data.output_text;
  const output = data.output;
  if (!Array.isArray(output)) return undefined;
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }
  return undefined;
}

function buildHeaders(ctx: ProviderContext): Record<string, string> {
  const s = settingsOf(ctx);
  return {
    Authorization: `Bearer ${ctx.apiKey}`,
    ...s.customHeaders,
  };
}
