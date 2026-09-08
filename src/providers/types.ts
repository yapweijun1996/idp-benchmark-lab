import type { NormalizedError, ProviderConfig, ProviderKind } from "../storage/types";

// Single definition source: BenchmarkRun.error reuses this shape.
export type ProviderError = NormalizedError & { evidence?: NormalizedExtractionResponse };

export type { ProviderConfig, ProviderKind };

export type GatewayRequestMeta = {
  phase: "map" | "reduce";
  index: number;
  total: number;
  pageFrom?: number;
  pageTo?: number;
};

export interface ProviderRequestLease {
  settle(costUsd?: number): void;
}

export type ProviderRequestCostSource = "provider_reported" | "usage_snapshot" | "flat" | "unknown";

export interface ProviderRequestSettlement {
  costUsd?: number;
  costSource: ProviderRequestCostSource;
}

export interface ProviderRequestGate {
  beforeRequest(meta: GatewayRequestMeta): Promise<ProviderRequestLease>;
  afterResponse(lease: ProviderRequestLease | undefined, response?: NormalizedExtractionResponse, error?: unknown): ProviderRequestSettlement | void;
}

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
  /** Optional per-network-request Stop/budget/evidence gate. */
  requestGate?: ProviderRequestGate;
}

export interface PageImage {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
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
  /** Internal adapter phase; not persisted or sent to providers. */
  requestPhase?: "map" | "reduce";
}

export interface NormalizedUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  totalTokens?: number;
}

export interface NormalizedExtractionResponse {
  parseError?: string;
  /** Redacted full transport envelope, independent of extraction parsing. */
  envelope?: string;
  /** Raw response text, stored as run evidence (secrets already excluded). */
  raw: string;
  json: unknown;
  usage?: NormalizedUsage;
  providerReportedCostUsd?: number;
  providerCalls: number;
  /** Redacted evidence for each map/reduce HTTP request in a logical run. */
  providerAttempts?: import("./demoGateway").GatewayProviderAttempt[];
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
