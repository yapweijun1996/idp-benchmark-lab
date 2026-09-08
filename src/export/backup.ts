import { blobToArrayBuffer } from "../documents/blob";
import Dexie from "dexie";
import { redact } from "../providers/redaction";
import { validateBackupEntities } from "./validateBackup";
import { clearAllKeys } from "../providers/keys";
import { arrayBufferToBase64 } from "../providers/base64";
import type { IdpDatabase } from "../storage/db";
import type {
  AppSettings,
  BenchmarkRun,
  BenchmarkSuite,
  DocumentRecord,
  ExtractionProfile,
  GoldenAnswer,
  PricingSnapshot,
  ProviderConfig,
} from "../storage/types";

export const BACKUP_FORMAT_VERSION = 1;

type SerializedDocument = Omit<DocumentRecord, "blob" | "blobBytes"> & { blobBase64?: string };

export interface BackupEntities {
  documents: SerializedDocument[];
  extractionProfiles: ExtractionProfile[];
  goldenAnswers: GoldenAnswer[];
  providerConfigs: ProviderConfig[];
  pricingSnapshots: PricingSnapshot[];
  benchmarkSuites: BenchmarkSuite[];
  benchmarkRuns: BenchmarkRun[];
  appSettings: AppSettings[];
}

export interface BackupBundle {
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  entities: BackupEntities;
}

export interface BuildBackupOptions {
  /** Blob lookup seam; production reads the stored Blob, tests inject real ones. */
  getBlob?: (doc: DocumentRecord) => Promise<Blob | undefined>;
}

/** Full project backup (docs/LOCAL_STORAGE.md): entities + hashes, no secrets. */
export async function buildBackup(db: IdpDatabase, options: BuildBackupOptions = {}): Promise<BackupBundle> {
  const documentsRaw = await db.documents.toArray();
  const documents: SerializedDocument[] = [];
  for (const doc of documentsRaw) {
    const { blob, blobBytes, ...rest } = doc;
    const usableBlob = options.getBlob
      ? await options.getBlob(doc)
      : blobBytes ? new Blob([blobBytes], { type: "application/pdf" }) : typeof blob?.arrayBuffer === "function"
        ? blob
        : undefined;
    if (usableBlob) {
      const bytes = await blobToArrayBuffer(usableBlob);
      documents.push({ ...rest, blobBase64: arrayBufferToBase64(bytes) });
    } else {
      documents.push(rest);
    }
  }
  return redact({
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "0.1.0",
    exportedAt: new Date().toISOString(),
    entities: {
      documents,
      extractionProfiles: await db.extractionProfiles.toArray(),
      goldenAnswers: await db.goldenAnswers.toArray(),
      providerConfigs: await db.providerConfigs.toArray(),
      pricingSnapshots: await db.pricingSnapshots.toArray(),
      benchmarkSuites: await db.benchmarkSuites.toArray(),
      benchmarkRuns: await db.benchmarkRuns.toArray(),
      appSettings: await db.appSettings.toArray(),
    },
  });
}

export class BackupError extends Error {
  readonly code: "invalid_json" | "invalid_format" | "invalid_entities" | "secret_found";

  constructor(code: BackupError["code"], message: string) {
    super(message);
    this.name = "BackupError";
    this.code = code;
  }
}

function assertNoSecrets(records: unknown[], store: string): void {
  if (JSON.stringify(redact(records)) !== JSON.stringify(records)) throw new BackupError("secret_found", `Backup contains credential material in ${store}; refusing import.`);
}

function asRecords(value: unknown, store: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new BackupError("invalid_entities", `Backup entities.${store} must be an array.`);
  }
  for (const record of value) {
    if (!record || typeof record !== "object" || typeof (record as Record<string, unknown>).id !== "string") {
      throw new BackupError("invalid_entities", `Backup entities.${store} contains a record without a string id.`);
    }
  }
  return value;
}

/**
 * Validates a parsed backup (structure, ids, secret absence) and imports it.
 * mode "replace" clears stores first (restore semantics); "merge" overwrites
 * by id (DATA_MODEL.md: imported data is validated before write).
 */
export async function importBackup(
  db: IdpDatabase,
  text: string,
  mode: "replace" | "merge" = "replace",
): Promise<number> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new BackupError("invalid_json", "Backup is not valid JSON: " + (e instanceof Error ? e.message : String(e)));
  }
  const bundle = parsed as Partial<BackupBundle>;
  if (!bundle || typeof bundle !== "object" || bundle.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new BackupError("invalid_format", `Expected formatVersion ${BACKUP_FORMAT_VERSION}.`);
  }
  const entities = bundle.entities;
  if (!entities || typeof entities !== "object") {
    throw new BackupError("invalid_entities", "Backup is missing the entities object.");
  }
  const e = entities as unknown as Record<string, unknown>;
  const stores: [keyof BackupEntities, string][] = [
    ["documents", "documents"],
    ["extractionProfiles", "extractionProfiles"],
    ["goldenAnswers", "goldenAnswers"],
    ["providerConfigs", "providerConfigs"],
    ["pricingSnapshots", "pricingSnapshots"],
    ["benchmarkSuites", "benchmarkSuites"],
    ["benchmarkRuns", "benchmarkRuns"],
    ["appSettings", "appSettings"],
  ];
  const validated = new Map<keyof BackupEntities, unknown[]>();
  for (const [key] of stores) {
    const records = asRecords(e[key], key);
    assertNoSecrets(records, key);
    validated.set(key, records);
  }
  if (typeof bundle.appVersion !== "string" || !bundle.appVersion.trim() || typeof bundle.exportedAt !== "string" || !Number.isFinite(Date.parse(bundle.exportedAt))) throw new BackupError("invalid_format", "Backup build identity and export timestamp are required.");
  if (mode !== "replace" && mode !== "merge") throw new BackupError("invalid_format", "Unsupported import mode.");
  if (mode === "replace") {
    try { await validateBackupEntities(entities); }
    catch { throw new BackupError("invalid_entities", "Backup entity, hash, or reference validation failed; no data was changed."); }
  }

  let count = 0;
  await db.transaction("rw", db.tables, async () => {
    if (mode === "merge") {
      const existing = await Dexie.waitFor(buildBackup(db));
      for (const [key] of stores) {
        const records = new Map(existing.entities[key].map((record) => [record.id, record]));
        for (const record of entities[key]) records.set(record.id, record as never);
        Object.assign(existing.entities, { [key]: [...records.values()] });
      }
      try { await Dexie.waitFor(validateBackupEntities(existing.entities)); }
      catch { throw new BackupError("invalid_entities", "Merge would invalidate retained records; no data was changed."); }
    }
    if (mode === "replace") {
      await Promise.all(db.tables.map((table) => table.clear()));
    }
    for (const [key, tableName] of stores) {
      const records = validated.get(key)!;
      if (records.length === 0) {
        continue;
      }
      const table = db.table(tableName as string);
      const withBlobs = key === "documents"
        ? (records as SerializedDocument[]).map((r) => {
            const { blobBase64, ...rest } = r;
            if (blobBase64) {
              const binary = atob(blobBase64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
              }
              return { ...rest, blobBytes: bytes.buffer } as DocumentRecord;
            }
            return rest as DocumentRecord;
          })
        : records;
      await table.bulkPut(withBlobs as never[]);
      count += records.length;
    }
  });
  if (mode === "replace") clearAllKeys();
  return count;
}
