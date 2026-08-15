import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "../storage/db";
import { PRICING_PRESETS, presetToSnapshot } from "./pricing";
import { PricingService } from "./pricingService";

let db: IdpDatabase;
let service: PricingService;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-pricing-test-${counter}`);
  service = new PricingService(db);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("pricing presets", () => {
  it("lists model names without hard-coded prices", () => {
    expect(PRICING_PRESETS.length).toBeGreaterThan(0);
    for (const preset of PRICING_PRESETS) {
      expect(preset.note).toMatch(/verify/i);
    }
  });

  it("builds a snapshot with user-verified rates", () => {
    const preset = PRICING_PRESETS[0]!;
    const snapshot = presetToSnapshot(preset, { inputPerMillion: 0.15, outputPerMillion: 0.6 });
    expect(snapshot.currency).toBe("USD");
    expect(snapshot.model).toBe(preset.model);
    expect(snapshot.inputPerMillion).toBe(0.15);
    expect(snapshot.effectiveAt).toBeTruthy();
  });
});

describe("PricingService", () => {
  it("returns the latest snapshot for a provider+model", async () => {
    const preset = PRICING_PRESETS[0]!;
    await service.save(presetToSnapshot(preset, { inputPerMillion: 0.1, sourceNote: "old" }));
    await service.save({
      ...presetToSnapshot(preset, { inputPerMillion: 0.15, sourceNote: "current" }),
      effectiveAt: "2026-08-20T00:00:00.000Z",
    });
    const latest = await service.latestFor(preset.provider, preset.model);
    expect(latest?.inputPerMillion).toBe(0.15);
  });
});
