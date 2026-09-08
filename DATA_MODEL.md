# DATA_MODEL — Local Browser Data

Persistent entities use IndexedDB. Session-only document blobs and provider credentials use separate in-memory/session mechanisms.

`src/storage/types.ts` and `src/storage/db.ts` define the current executable model. The database is schema version 1 with eight stores and no later upgrade handler yet. Any remediation that changes records must add and test a forward migration rather than assuming a fresh database. The [review](docs/reviews/2026-09-08-production-readiness.md) identified gaps between those types/storage behavior and the intended safety and history guarantees below.

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

Current profile/Golden updates increment the version field but overwrite the existing ID; previous versions are not retained as separate records. Historical results resolve Golden data by that mutable ID. Immutable version retention or suite snapshots are required by TASK-061.

### ProviderConfig

The dedicated API-key field is stored separately in memory by default. The open-ended `settings` object can currently persist secret custom headers; it must not be treated as a validated secret-free record (TASK-058).

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

Stores identity hashes/IDs, requested run count, concurrency, budget, timestamps, status, and optional accumulated positive known cost. The runner currently leaves `costUsdKnown` unset when the accumulated known cost is zero. It does not yet freeze complete effective inputs, custom endpoint/settings or applied pricing. TASK-061/064 must make the historical evidence immutable and auditable.

### BenchmarkRun

Stores run number, state, optional latency/raw response/parsed JSON, schema status, strict exact/leaf/row metrics, strict leaf mismatches, output hash, usage, cost, and normalized error. Normalized evaluation metrics, schema error details, and detailed missing/extra/duplicate row results are not stored (TASK-065). `safeRawResponse` is currently a field name, not an enforced redaction guarantee; malformed provider output loses raw/usage/timing evidence before this record is written (TASK-058/063).

### AppSettings

```ts
type AppSettings = {
  id: "app";
  language?: "en" | "zh" | "ms" | "ja" | "vi";
  defaultProviderId?: string;
  defaultConcurrency: number;
  defaultInputMode: "native_pdf" | "canonical_images";
  defaultRunCount: number;
  theme: "light" | "dark" | "system";
  showSecretsWarning: boolean;
  updatedAt: string;
};
```

The active UI uses `language`, `defaultInputMode`, and `defaultRunCount`. Other settings fields exist in the type/default record but are not all exposed or consumed by current product flows.

## Storage rules

These are required invariants. Current backup validation checks the envelope and string IDs, not complete entity/reference validity, and export does not enforce secret removal. See TASK-058/062 before relying on these rules as implemented controls.

- version the IndexedDB schema and migrate forward before changing version 1
- migrate forward deterministically
- failed migration must not delete benchmark data
- backups include their own `formatVersion` and app version; this is not currently an IndexedDB schema-version export
- imported data is validated before write
- secrets are excluded from export
- persist each completed run promptly to reduce evidence loss on refresh
