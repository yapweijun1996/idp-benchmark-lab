import { bodyText, errorFromStatus, extractJson, fetchJson } from "./common";
import type {
  NormalizedExtractionRequest,
  NormalizedExtractionResponse,
  ProviderAdapter,
  ProviderCapabilities,
  ProviderContext,
  ProviderError,
} from "./types";

const OPENAI_BASE = "https://api.openai.com/v1";

function capabilities(): ProviderCapabilities {
  return {
    nativePdf: false,
    imageInput: true,
    structuredOutput: true,
    tokenUsage: true,
    providerReportedCost: false,
    temperature: true,
    thinking: true,
  };
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` };
}

function invalidRequest(message: string): ProviderError {
  return { category: "invalid_request", message, retryable: false };
}

export const openaiAdapter: ProviderAdapter = {
  kind: "openai",

  capabilities,

  async testConnection(ctx: ProviderContext) {
    try {
      const result = await fetchJson(
        `${OPENAI_BASE}/models`,
        { method: "GET", headers: authHeaders(ctx.apiKey) },
        ctx.signal,
      );
      if (!result.ok) {
        return { ok: false, message: "OpenAI connection failed", error: errorFromStatus(result.status, bodyText(result.json) || result.text) };
      }
      return { ok: true, message: "OpenAI reachable; API key accepted." };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw e;
      }
      const err = e as ProviderError;
      return { ok: false, message: "OpenAI connection failed", error: err };
    }
  },

  async extract(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse> {
    if (request.mode !== "canonical_images") {
      throw invalidRequest(
        "This OpenAI adapter accepts canonical rendered images only (nativePdf=false). Use the Canonical Images input mode.",
      );
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
      response_format: { type: "json_object" },
    };
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.thinking) {
      body.reasoning_effort = request.thinking;
    }

    const result = await fetchJson(
      `${OPENAI_BASE}/chat/completions`,
      {
        method: "POST",
        headers: { ...authHeaders(ctx.apiKey), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      ctx.signal,
    );
    if (!result.ok) {
      throw errorFromStatus(result.status, bodyText(result.json) || result.text);
    }

    const data = (result.json ?? {}) as {
      choices?: { message?: { content?: unknown; refusal?: unknown } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const contentText = data.choices?.[0]?.message?.content;
    if (typeof contentText !== "string" || contentText.length === 0) {
      throw { category: "provider", message: "OpenAI response contained no text content", retryable: false } satisfies ProviderError;
    }
    const json = extractJson(contentText);
    if (json === undefined) {
      throw { category: "provider", message: "OpenAI response text was not parseable JSON", retryable: false } satisfies ProviderError;
    }
    const usage = data.usage;
    return {
      raw: contentText,
      json,
      usage: usage
        ? {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      providerCalls: 1,
    };
  },
};
