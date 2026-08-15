import { getDb, type IdpDatabase } from "../storage/db";
import type { PricingSnapshot } from "../storage/types";

/** Pricing snapshots (docs/COST_AND_PRICING.md): saved per benchmark, never silently repriced. */
export class PricingService {
  constructor(private db: IdpDatabase = getDb()) {}

  async list(): Promise<PricingSnapshot[]> {
    const all = await this.db.pricingSnapshots.toArray();
    return all.sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt));
  }

  async get(id: string): Promise<PricingSnapshot | undefined> {
    return this.db.pricingSnapshots.get(id);
  }

  async save(snapshot: PricingSnapshot): Promise<PricingSnapshot> {
    await this.db.pricingSnapshots.put(snapshot);
    return snapshot;
  }

  /** Latest snapshot for a provider+model, if any. */
  async latestFor(provider: string, model: string): Promise<PricingSnapshot | undefined> {
    return this.db.pricingSnapshots
      .where("provider")
      .equals(provider)
      .and((s) => s.model === model)
      .sortBy("effectiveAt")
      .then((rows) => rows.at(-1));
  }

  async remove(id: string): Promise<void> {
    await this.db.pricingSnapshots.delete(id);
  }
}
