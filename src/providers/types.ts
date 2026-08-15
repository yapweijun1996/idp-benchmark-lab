import type { NormalizedError, ProviderConfig, ProviderKind } from "../storage/types";

// Single definition source: BenchmarkRun.error reuses this shape.
export type ProviderError = NormalizedError;

export type { ProviderConfig, ProviderKind };

export interface ProviderCapabilities {
  nativePdf: boolean;
  imageInput: boolean;
  structuredOutput: boolean;
  tokenUsage: boolean;
  providerReportedCost: boolean;
  temperature: boolean;
  thinking: boolean;
}

/** Memory-only credentials + request context (docs/PROVIDER_ADAPTER.md). */
export interface ProviderContext {
  config: ProviderConfig;
  apiKey: string;
  signal?: AbortSignal;
}

export interface PageImage {
  mimeType: "image/png" | "image/jpeg";
  dataUrl: string;
}

export interface NormalizedExtractionRequest {
  mode: "native_pdf" | "canonical_images";
  documentBytes?: ArrayBuffer;
  documentMimeType?: string;
  documentName?: string;
  images?: PageImage[];
  prompt: string;
  temperature?: number;
  thinking?: string;
}

export interface NormalizedUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  totalTokens?: number;
}

export interface NormalizedExtractionResponse {
  /** Raw response text, stored as run evidence (secrets already excluded). */
  raw: string;
  json: unknown;
  usage?: NormalizedUsage;
  providerReportedCostUsd?: number;
  providerCalls: number;
}

export interface ConnectionResult {
  ok: boolean;
  message: string;
  error?: ProviderError;
}

/** Canonical adapter contract (docs/PROVIDER_ADAPTER.md). */
export interface ProviderAdapter {
  readonly kind: ProviderKind;
  capabilities(config: ProviderConfig): ProviderCapabilities;
  testConnection(ctx: ProviderContext): Promise<ConnectionResult>;
  extract(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse>;
}
