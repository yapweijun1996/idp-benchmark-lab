import { afterEach, expect, it } from "vitest";
import { IdpDatabase } from "../storage/db";
import { ProviderConfigService } from "./configService";
import { clearAllKeys, getApiKey, getRuntimeHeaders, setApiKey } from "./keys";
import { buildBackup } from "../export/backup";
import { redact } from "./redaction";

afterEach(clearAllKeys);
it("keeps custom credentials in memory and removes them with the provider", async () => {
  const db = new IdpDatabase(crypto.randomUUID());
  const service = new ProviderConfigService(db);
  try {
    const config = await service.save({ id: "provider", kind: "openai_compatible", name: "Test", model: "test", settings: {
      customHeaders: { Authorization: "Bearer synthetic-header-credential", "X-Private": "synthetic-private-value" },
    } });
    setApiKey(config.id, "synthetic-api-credential", { rememberForTab: true });
    expect(getRuntimeHeaders(config.id).Authorization).toBe("Bearer synthetic-header-credential");
    expect(config.settings.customHeaders).toEqual({});
    await db.benchmarkRuns.put({ id: "run", suiteId: "suite", runNumber: 1, state: "provider_error", providerCalls: 1,
      createdAt: new Date().toISOString(), safeRawResponse: 'malformed synthetic-api-credential',
      parsedJson: { nested: ["synthetic-private-value", { authorization: "another-secret" }] },
      error: { category: "provider", message: "echo synthetic-header-credential", retryable: false } });
    const backup = JSON.stringify(await buildBackup(db));
    for (const secret of ["synthetic-api-credential", "synthetic-private-value", "synthetic-header-credential", "another-secret"]) {
      expect(backup).not.toContain(secret);
    }
    expect(backup).toContain("[REDACTED]");
    await service.remove(config.id);
    expect(getApiKey(config.id)).toBeUndefined();
    expect(getRuntimeHeaders(config.id)).toEqual({});
  } finally { await db.delete(); }
});
it("redacts nested and serialized credential fields without changing ordinary document values", () => {
  expect(redact({ raw: '{"nested":{"x-api-key":"hidden"}}', json: { amount: null, number: "001" } }))
    .toEqual({ raw: '{"nested":{"x-api-key":"[REDACTED]"}}', json: { amount: null, number: "001" } });
});
it("does not treat ordinary extracted token labels as provider credentials", () => {
  expect(redact({ parsedJson: { token: "001", password: "printed-value" }, headers: { "X-Trace": "value" } }))
    .toEqual({ parsedJson: { token: "001", password: "printed-value" }, headers: {} });
  expect(redact({ parsedJson: { access_token: "provider-secret" } })).toEqual({ parsedJson: { access_token: "[REDACTED]" } });
});
it("redacts malformed credential fields and credential-bearing URLs", () => {
  expect(redact('broken {"nested":{"Authorization":"unknown-value')).not.toContain("unknown-value");
  expect(redact("https://user:password@example.invalid?api_key=other-value")).toBe("https://[REDACTED]@example.invalid?api_key=[REDACTED]");
});
