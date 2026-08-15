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
