import Dexie, { type EntityTable } from "dexie";
import type {
  AppSettings,
  BenchmarkRun,
  BenchmarkSuite,
  DocumentRecord,
  ExtractionProfile,
  GoldenAnswer,
  PricingSnapshot,
  ProviderConfig,
} from "./types";

export const DB_NAME = "idp-benchmark-lab";
export const DB_VERSION = 1;

/**
 * IndexedDB schema (docs/LOCAL_STORAGE.md). No store ever holds API keys.
 * Migrations must be forward-only and deterministic (DATA_MODEL.md storage rules).
 */
export class IdpDatabase extends Dexie {
  documents!: EntityTable<DocumentRecord, "id">;
  extractionProfiles!: EntityTable<ExtractionProfile, "id">;
  goldenAnswers!: EntityTable<GoldenAnswer, "id">;
  providerConfigs!: EntityTable<ProviderConfig, "id">;
  pricingSnapshots!: EntityTable<PricingSnapshot, "id">;
  benchmarkSuites!: EntityTable<BenchmarkSuite, "id">;
  benchmarkRuns!: EntityTable<BenchmarkRun, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor(name = DB_NAME) {
    super(name);
    this.version(DB_VERSION).stores({
      documents: "id, sha256, createdAt",
      extractionProfiles: "id, name, version, promptSha256, schemaSha256, updatedAt",
      goldenAnswers: "id, documentId, profileId, [profileId+profileVersion], version, sha256, createdAt",
      providerConfigs: "id, kind, name",
      pricingSnapshots: "id, provider, model, effectiveAt",
      benchmarkSuites: "id, status, createdAt",
      benchmarkRuns: "id, suiteId, runNumber, state, &[suiteId+runNumber]",
      appSettings: "id",
    });
  }
}

/** Singleton for the app; tests create isolated instances with a unique name. */
let shared: IdpDatabase | undefined;

export function getDb(): IdpDatabase {
  if (!shared) {
    shared = new IdpDatabase();
  }
  return shared;
}
