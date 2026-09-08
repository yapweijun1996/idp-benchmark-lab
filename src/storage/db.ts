import Dexie, { type EntityTable } from "dexie";
import { blobToArrayBuffer } from "../documents/blob";
import { collectCredentials, redact } from "../providers/redaction";
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
export const DB_VERSION = 2;

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
    this.version(1).stores({
      documents: "id, sha256, createdAt",
      extractionProfiles: "id, name, version, promptSha256, schemaSha256, updatedAt",
      goldenAnswers: "id, documentId, profileId, [profileId+profileVersion], version, sha256, createdAt",
      providerConfigs: "id, kind, name",
      pricingSnapshots: "id, provider, model, effectiveAt",
      benchmarkSuites: "id, status, createdAt",
      benchmarkRuns: "id, suiteId, runNumber, state, &[suiteId+runNumber]",
      appSettings: "id",
    });
    this.version(2).stores({}).upgrade(async (tx) => {
      const configs = await tx.table("providerConfigs").toArray();
      configs.forEach(collectCredentials);
      const documents = await tx.table("documents").toArray();
      for (const document of documents) {
        if (document.blob && typeof document.blob === "object" && typeof (document.blob as Blob).arrayBuffer === "function") {
          document.blobBytes = new Uint8Array(await Dexie.waitFor(blobToArrayBuffer(document.blob))).slice().buffer;
          delete document.blob;
          await tx.table("documents").put(document);
        }
      }
      for (const table of tx.db.tables) {
        const records = await tx.table(table.name).toArray();
        for (const record of records) await tx.table(table.name).put(redact(record));
      }
      await tx.table("benchmarkSuites").toCollection().modify((suite) => {
        if (!suite.snapshot) suite.legacyEvidence = "unavailable";
      });
    });
    for (const table of this.tables) {
      table.hook("creating", (_key, record) => {
        collectCredentials(record);
        Object.assign(record, redact(record));
      });
      table.hook("updating", (changes) => {
        collectCredentials(changes);
        return redact(changes);
      });
    }
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
