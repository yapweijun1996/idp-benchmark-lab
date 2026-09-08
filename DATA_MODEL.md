# DATA_MODEL — Local Browser Data

Persistent entities use IndexedDB. Session-only document blobs and provider credentials use separate in-memory/session mechanisms.

`src/storage/types.ts` and `src/storage/db.ts` own the executable model. Schema version 2 migrates version 1 in a transaction, retains records, redacts legacy credentials and converts PDF Blobs to ArrayBuffer bytes. The public backup envelope remains formatVersion 1; suites declare evidenceVersion 2.

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
  blobBytes?: ArrayBuffer; // Persisted PDF bytes; blob is a legacy/runtime field.
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

Profile/Golden editors increment versions on their existing IDs. Each new suite stores the selected versions and content in an immutable snapshot; history reads that snapshot. Legacy suites without snapshots are explicitly marked unavailable rather than resolved against mutable records.

### ProviderConfig

Dedicated keys and arbitrary custom headers are ephemeral. Persisted settings have an empty customHeaders object, and recursive persistence/export redaction handles known credential echoes and secret-bearing fields.

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

Stores identity, timestamps and a frozen snapshot of PDF bytes, canonical images when used, document/profile/Golden versions, effective prompt/schema, endpoint/settings, pricing and execution settings. A SHA-256 digest covers the effective snapshot. Build identity includes package version, Git revision and a unique build UUID. Known cost zero is retained.

### BenchmarkRun

Stores run state, redacted raw/parsed output, strict and normalized metrics, policy, hashes, usage, timing and cost. An attempts array retains each response/error envelope and cost basis. A durable pendingAttempt records dispatch intent before network execution; interruption leaves its dispatch/billing uncertain and never replays it automatically.

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

Backup validation checks record schemas, unique IDs, references, hashes, snapshot versions, nested credential material and binary payloads before mutation. Merge validates retained and incoming records together. Replace clears runtime credentials after successful commit.

- version the IndexedDB schema and migrate forward before changing version 1
- migrate forward deterministically
- failed migration must not delete benchmark data
- backups include their own `formatVersion` and app version; this is not currently an IndexedDB schema-version export
- imported data is validated before write
- secrets are excluded from export
- persist each completed run promptly to reduce evidence loss on refresh
