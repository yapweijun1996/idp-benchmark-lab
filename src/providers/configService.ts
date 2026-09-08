import { getDb, type IdpDatabase } from "../storage/db";
import type { ProviderConfig } from "../storage/types";
import { clearApiKey, setRuntimeHeaders } from "./keys";
import { collectCredentials, redact } from "./redaction";
import { DEMO_GATEWAY_MODEL, DEMO_GATEWAY_PROJECT_ID, DEMO_GATEWAY_SESSION_PATH, forgetGatewayDemoSession, gatewayDemoDefaults } from "./demoGateway";
import { getAppSettings, saveAppSettings } from "../storage/settings";

/** Stable id for the first-run Gateway Demo configuration. It has no key or session token. */
export const DEFAULT_GATEWAY_DEMO_PROVIDER_ID = "demo-provider-gateway";

/**
 * Offer the Gateway Demo once for a new browser profile. The marker prevents
 * an intentional removal from being undone on the next route mount. Calling
 * this from the provider hook also removes the App/child-effect race during
 * first render, while retaining the same idempotent seed used by the fixture.
 */
export async function ensureDefaultGatewayDemoProvider(db: IdpDatabase = getDb()): Promise<void> {
  const settings = await getAppSettings(db);
  if (settings.gatewayDemoSeeded) return;

  const count = await db.providerConfigs.count();
  if (count > 0) {
    await saveAppSettings({ gatewayDemoSeeded: true }, db);
    return;
  }

  const defaults = gatewayDemoDefaults();
  const service = new ProviderConfigService(db);
  await service.save({
    id: DEFAULT_GATEWAY_DEMO_PROVIDER_ID,
    kind: "openai_compatible",
    name: "Gateway Demo",
    baseUrl: defaults.baseUrl,
    model: DEMO_GATEWAY_MODEL,
    settings: {
      endpointProfile: "gateway_demo",
      gatewayOrigin: defaults.origin,
      gatewaySessionPath: DEMO_GATEWAY_SESSION_PATH,
      gatewayProjectId: DEMO_GATEWAY_PROJECT_ID,
      apiStyle: "responses",
    },
  });
  await saveAppSettings({ gatewayDemoSeeded: true }, db);
}

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
    const settings = { ...input.settings };
    if (input.kind === "openai_compatible" && settings.endpointProfile === "gateway_demo") {
      // Demo sessions use an origin-bound dmo token, never caller-supplied
      // gateway headers. Keep the persisted profile free of header material.
      delete settings.customHeaders;
    }
    const record: ProviderConfig = {
      id: input.id ?? crypto.randomUUID(),
      kind: input.kind,
      name: input.name,
      baseUrl: input.baseUrl,
      model: input.model,
      settings,
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
    forgetGatewayDemoSession(id);
  }
}
