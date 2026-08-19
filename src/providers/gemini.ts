import { arrayBufferToBase64 } from "./base64";
import { bodyText, errorFromStatus, extractJson, fetchJson } from "./common";
import type {
  NormalizedExtractionRequest,
  NormalizedExtractionResponse,
  ProviderAdapter,
  ProviderCapabilities,
  ProviderContext,
  ProviderError,
} from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function capabilities(): ProviderCapabilities {
  return {
    nativePdf: true,
    imageInput: true,
    structuredOutput: true,
    tokenUsage: true,
    providerReportedCost: false,
    temperature: true,
    thinking: true,
  };
}

/** Key goes in the x-goog-api-key header so it never appears in URLs/logs. */
function authHeaders(apiKey: string): Record<string, string> {
  return { "x-goog-api-key": apiKey };
}

function invalidRequest(message: string): ProviderError {
  return { category: "invalid_request", message, retryable: false };
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
  };
}

function partsFromRequest(request: NormalizedExtractionRequest): GeminiPart[] {
  if (request.mode === "native_pdf") {
    if (!request.documentBytes) {
      throw invalidRequest("No PDF bytes were supplied for native_pdf mode.");
    }
    return [
      { text: request.prompt },
      {
        inlineData: {
          mimeType: request.documentMimeType ?? "application/pdf",
          data: arrayBufferToBase64(request.documentBytes),
        },
      },
    ];
  }
  if (!request.images || request.images.length === 0) {
    throw invalidRequest("No page images were supplied for canonical_images mode.");
  }
  return [
    { text: request.prompt },
    ...request.images.map((image) => ({
      inlineData: {
        mimeType: image.mimeType,
        data: image.dataUrl.split(",")[1] ?? "",
      },
    })),
  ];
}

function generationConfig(request: NormalizedExtractionRequest): Record<string, unknown> {
  const config: Record<string, unknown> = {
    responseMimeType: "application/json",
  };
  if (request.temperature !== undefined) {
    config.temperature = request.temperature;
  }
  if (request.thinking) {
    config.thinkingConfig = { thinkingLevel: request.thinking };
  }
  return config;
}

export const geminiAdapter: ProviderAdapter = {
  kind: "gemini",

  capabilities,

  async testConnection(ctx: ProviderContext) {
    try {
      const url = `${GEMINI_BASE}/models/${encodeURIComponent(ctx.config.model)}`;
      const result = await fetchJson(url, { method: "GET", headers: authHeaders(ctx.apiKey) }, ctx.signal);
      if (!result.ok) {
        return { ok: false, message: "Gemini connection failed", error: errorFromStatus(result.status, bodyText(result.json) || result.text) };
      }
      return { ok: true, message: "Gemini reachable; model and API key accepted." };
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw e;
      }
      return { ok: false, message: "Gemini connection failed", error: e as ProviderError };
    }
  },

  async extract(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse> {
    const body = {
      contents: [{ role: "user", parts: partsFromRequest(request) }],
      generationConfig: generationConfig(request),
    };

    const url = `${GEMINI_BASE}/models/${encodeURIComponent(ctx.config.model)}:generateContent`;
    const result = await fetchJson(
      url,
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

    const data = (result.json ?? {}) as GeminiResponse;
    const blockReason = data.promptFeedback?.blockReason;
    if (blockReason) {
      throw {
        category: "invalid_request",
        message: `Gemini blocked the request: ${blockReason}`,
        retryable: false,
      } satisfies ProviderError;
    }
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("");
    if (!text) {
      throw {
        category: "provider",
        message: `Gemini returned no text (finishReason: ${candidate?.finishReason ?? "unknown"})`,
        retryable: false,
      } satisfies ProviderError;
    }
    const json = extractJson(text);
    if (json === undefined) {
      throw {
        category: "provider",
        message: "Gemini response text was not parseable JSON",
        retryable: false,
      } satisfies ProviderError;
    }
    const usage = data.usageMetadata;
    return {
      raw: text,
      json,
      usage: usage
        ? {
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.candidatesTokenCount,
            cachedInputTokens: usage.cachedContentTokenCount,
            totalTokens: usage.totalTokenCount,
          }
        : undefined,
      providerCalls: 1,
    };
  },
};
