import { getDb, type IdpDatabase } from "../storage/db";
import type { ProviderConfig } from "../storage/types";

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
    const record: ProviderConfig = {
      id: input.id ?? crypto.randomUUID(),
      kind: input.kind,
      name: input.name,
      baseUrl: input.baseUrl,
      model: input.model,
      settings: input.settings,
      pricingSnapshotId: input.pricingSnapshotId,
    };
    await this.db.providerConfigs.put(record);
    return record;
  }

  async remove(id: string): Promise<void> {
    await this.db.providerConfigs.delete(id);
  }
}
