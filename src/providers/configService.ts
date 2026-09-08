import { getDb, type IdpDatabase } from "../storage/db";
import type { ProviderConfig } from "../storage/types";
import { clearApiKey, setRuntimeHeaders } from "./keys";
import { collectCredentials, redact } from "./redaction";

/** Persisted provider configuration — never contains API keys (ADR-012). */
export class ProviderConfigService {
  constructor(private db: IdpDatabase = getDb()) {}

  async list(): Promise<ProviderConfig[]> {
    return this.db.providerConfigs.toArray();
  }

  async get(id: string): Promise<ProviderConfig | undefined> {
    return this.db.providerConfigs.get(id);
  }

  async save(input: Omit<ProviderConfig, "id"> & { id?: string }): Promise<ProviderConfig> {
    if (input.baseUrl) {
      const url = new URL(input.baseUrl);
      if (url.username || url.password || url.search || url.hash) throw new Error("Provider base URL must not contain credentials, query parameters, or fragments. Use runtime headers.");
    }
    const record: ProviderConfig = {
      id: input.id ?? crypto.randomUUID(),
      kind: input.kind,
      name: input.name,
      baseUrl: input.baseUrl,
      model: input.model,
      settings: input.settings,
      pricingSnapshotId: input.pricingSnapshotId,
    };
    const headers = record.settings.customHeaders;
    if (headers && typeof headers === "object" && !Array.isArray(headers)) {
      if (!Object.values(headers).every((value) => typeof value === "string")) throw new Error("Custom headers must contain string values.");
      setRuntimeHeaders(record.id, headers as Record<string, string>);
    }
    collectCredentials(record);
    const safe = redact(record);
    await this.db.providerConfigs.put(safe);
    return safe;
  }

  async remove(id: string): Promise<void> {
    await this.db.providerConfigs.delete(id);
    clearApiKey(id);
  }
}
