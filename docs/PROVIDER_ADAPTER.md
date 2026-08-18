# Provider Adapter Contract

Adapter owns endpoint/request/auth format, PDF/image mapping, structured-output dialect, provider settings, response parsing, usage parsing, and provider error normalization.

Adapter does not own Golden comparison, benchmark scheduling, cost policy, canonical hashing, or UI metrics.

Suggested interface:

```ts
interface ProviderAdapter {
  kind: ProviderKind;
  capabilities(config: ProviderConfig): ProviderCapabilities;
  testConnection(ctx: ProviderContext): Promise<ConnectionResult>;
  extract(request: NormalizedExtractionRequest, ctx: ProviderContext): Promise<NormalizedExtractionResponse>;
}
```

Supporting types:

```ts
type ProviderKind = "openai" | "gemini" | "openai_compatible";

type ProviderContext = {
  config: ProviderConfig;
  apiKey: string; // memory-only; never persisted, logged, cached, or exported
  signal?: AbortSignal;
};
```

Normalized errors:

```ts
type ProviderError = {
  category: "auth" | "rate_limit" | "network" | "cors" | "invalid_request" | "unsupported" | "provider" | "unknown";
  message: string;
  status?: number;
  retryable: boolean;
};
```

Runner decides retry policy. Adapter must not retry indefinitely.

The Custom OpenAI-compatible adapter supports both `chat_completions` and
`responses` request styles. The bundled Demo GPT Gateway record is marked with
`demoMode: true`: it runs the bundled purchase-order fixtures locally, requires
no API key, and makes no network request. A real gateway must be saved as a
separate custom provider configuration; its key is entered at runtime and is
never part of the provider config, backup, or IndexedDB record.
