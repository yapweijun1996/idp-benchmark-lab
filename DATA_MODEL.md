# DATA_MODEL — Local Browser Data

All persistent entities use IndexedDB.

## Entities

### DocumentRecord

```ts
type DocumentRecord = {
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
```

### ExtractionProfile

```ts
type ExtractionProfile = {
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
```

### NormalizationPolicy

```ts
type NormalizationPolicy = {
  trimOuterWhitespace: boolean;
  normalizeLineEndings: boolean;
};
```

Only these documented conservative transformations are allowed. Normalization never rewrites identifiers, model numbers, amounts, or numeric types.

### GoldenAnswer

```ts
type GoldenAnswer = {
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
```

When the bound profile version changes, the UI must re-validate the Golden Answer and require explicit re-approval before it can be selected for a new benchmark.

### ProviderConfig

Raw API keys are excluded from persistence by default.

```ts
type ProviderConfig = {
  id: string;
  kind: "openai" | "gemini" | "openai_compatible";
  name: string;
  baseUrl?: string;
  model: string;
  settings: Record<string, unknown>;
  pricingSnapshotId?: string;
};
```

### PricingSnapshot

```ts
type PricingSnapshot = {
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
```

### BenchmarkSuite

Stores immutable benchmark identity, requested run count, concurrency, budget, mode, timestamps, status, and accumulated cost.

### BenchmarkRun

Stores run number, state, latency, safe raw response, parsed JSON, schema/exact/normalized status, leaf/row accuracy, hashes, usage, cost, and normalized error.

### AppSettings

```ts
type AppSettings = {
  id: "app";
  defaultProviderId?: string;
  defaultConcurrency: number;
  theme: "light" | "dark" | "system";
  showSecretsWarning: boolean;
  updatedAt: string;
};
```

## Storage rules

- version database schema
- migrate forward deterministically
- failed migration must not delete benchmark data
- export includes schema version
- imported data is validated before write
- secrets are excluded from export
- persist each completed run promptly to reduce evidence loss on refresh
