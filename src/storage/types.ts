// Local browser data entities (DATA_MODEL.md).
// API keys are intentionally absent: they are memory-only by default (ADR-012).

export type DocumentRecord = {
  id: string;
  name: string;
  mimeType: "application/pdf";
  size: number;
  sha256: string;
  pageCount?: number;
  createdAt: string;
  storageMode: "session" | "indexeddb";
  blob?: Blob;
};

export type NormalizationPolicy = {
  trimOuterWhitespace: boolean;
  normalizeLineEndings: boolean;
};

export type ExtractionProfile = {
  id: string;
  name: string;
  description?: string;
  version: number;
  basePrompt: string;
  extractionContract: unknown;
  jsonSchema: unknown;
  normalizationPolicy?: NormalizationPolicy;
  normalizationPolicySha256?: string;
  promptSha256: string;
  schemaSha256: string;
  createdAt: string;
  updatedAt: string;
};

export type GoldenAnswer = {
  id: string;
  documentId: string;
  profileId: string;
  profileVersion: number;
  version: number;
  json: unknown;
  sha256: string;
  schemaValid: boolean;
  createdAt: string;
};

export type ProviderKind = "openai" | "gemini" | "openai_compatible";

export type ProviderConfig = {
  id: string;
  kind: ProviderKind;
  name: string;
  baseUrl?: string;
  model: string;
  settings: Record<string, unknown>;
  pricingSnapshotId?: string;
};

export type PricingSnapshot = {
  id: string;
  provider: string;
  model: string;
  currency: "USD";
  inputPerMillion?: number;
  cachedInputPerMillion?: number;
  outputPerMillion?: number;
  flatPerRequest?: number;
  effectiveAt: string;
  sourceNote?: string;
};

export type InputMode = "native_pdf" | "canonical_images";

export type LanguageCode = "en" | "zh" | "ms" | "ja" | "vi";

export type BenchmarkIdentity = {
  documentSha256: string;
  profileId: string;
  profileVersion: number;
  promptSha256: string;
  schemaSha256: string;
  normalizationPolicySha256?: string;
  goldenId?: string;
  goldenVersion?: number;
  goldenSha256?: string;
  providerKind: ProviderKind;
  model: string;
  thinking?: string;
  temperature?: number;
  inputMode: InputMode;
  rendererSettings?: unknown;
  concurrency: number;
  retryPolicyVersion: number;
  appBuild: string;
};

export type SuiteStatus = "draft" | "running" | "completed" | "stopped" | "budget_stopped" | "failed";

export type BenchmarkSuite = {
  id: string;
  name?: string;
  identity: BenchmarkIdentity;
  requestedRuns: number;
  concurrency: number;
  maxBudgetUsd?: number;
  /** Why the suite stopped early (budget/stop), for transparent UI. */
  stopReason?: string;
  status: SuiteStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  costUsdKnown?: number;
};

export type RunState =
  | "queued"
  | "running"
  | "succeeded"
  | "provider_error"
  | "parse_error"
  | "schema_invalid"
  | "cancelled";

export type NormalizedError = {
  category: "auth" | "rate_limit" | "network" | "cors" | "invalid_request" | "unsupported" | "provider" | "unknown";
  message: string;
  status?: number;
  retryable: boolean;
};

export type BenchmarkRun = {
  id: string;
  suiteId: string;
  runNumber: number;
  state: RunState;
  latencyMs?: number;
  safeRawResponse?: string;
  parsedJson?: unknown;
  schemaValid?: boolean;
  exactMatch?: boolean;
  leafAccuracy?: number;
  rowAccuracy?: number;
  rowMatched?: number;
  rowTotal?: number;
  /** Strict leaf mismatches from evaluation (path/expected/actual). */
  fieldMismatches?: { path: string; expected: unknown; actual: unknown }[];
  outputHash?: string;
  providerCalls: number;
  usage?: unknown;
  costUsd?: number;
  error?: NormalizedError;
  createdAt: string;
  finishedAt?: string;
};

export type AppSettings = {
  id: "app";
  language?: LanguageCode;
  defaultProviderId?: string;
  defaultConcurrency: number;
  defaultInputMode: InputMode;
  defaultRunCount: number;
  theme: "light" | "dark" | "system";
  showSecretsWarning: boolean;
  updatedAt: string;
};
