import { getDb, type IdpDatabase } from "../storage/db";
import type { DocumentRecord } from "../storage/types";
import { blobToArrayBuffer } from "./blob";
import { sha256Hex } from "./hash";

export class DocumentError extends Error {
  readonly code: "invalid_type" | "not_found" | "missing_blob";

  constructor(code: DocumentError["code"], message: string) {
    super(message);
    this.name = "DocumentError";
    this.code = code;
  }
}

interface SessionDoc {
  record: DocumentRecord;
  blob: Blob;
}

/**
 * Document lifecycle (SPEC FR-001, docs/LOCAL_STORAGE.md):
 * - default storage is session-only (memory; lost on reload)
 * - optional explicit persistence stores the blob in IndexedDB
 * - metadata fingerprints (SHA-256) are always computed at upload
 */
export class DocumentService {
  private session = new Map<string, SessionDoc>();

  constructor(private db: IdpDatabase = getDb()) {}

  async upload(file: File, opts: { persist: boolean }): Promise<DocumentRecord> {
    if (file.type !== "application/pdf") {
      throw new DocumentError("invalid_type", `Expected application/pdf, got ${file.type || "unknown"}`);
    }
    const data = await blobToArrayBuffer(file);
    const sha256 = await sha256Hex(data);
    const base = {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: "application/pdf" as const,
      size: file.size,
      sha256,
      createdAt: new Date().toISOString(),
    };

    if (opts.persist) {
      const record: DocumentRecord = { ...base, storageMode: "indexeddb", blob: file };
      await this.db.documents.put(record);
      return record;
    }

    const record: DocumentRecord = { ...base, storageMode: "session" };
    this.session.set(record.id, { record, blob: file });
    return record;
  }

  /** All documents, session records first. */
  async list(): Promise<DocumentRecord[]> {
    const persisted = await this.db.documents.toArray();
    const sessionRecords = [...this.session.values()].map((s) => s.record);
    return [...sessionRecords, ...persisted];
  }

  async getBlob(id: string): Promise<Blob | undefined> {
    const sessionDoc = this.session.get(id);
    if (sessionDoc) {
      return sessionDoc.blob;
    }
    const persisted = await this.db.documents.get(id);
    return persisted?.blob;
  }

  async remove(id: string): Promise<void> {
    this.session.delete(id);
    await this.db.documents.delete(id);
  }

  /** Records the page count discovered during preview. */
  async updatePageCount(id: string, pageCount: number): Promise<void> {
    const sessionDoc = this.session.get(id);
    if (sessionDoc) {
      sessionDoc.record = { ...sessionDoc.record, pageCount };
      return;
    }
    const persisted = await this.db.documents.get(id);
    if (persisted) {
      await this.db.documents.put({ ...persisted, pageCount });
    }
  }

  /** Toggle between session-only and IndexedDB persistence for an existing document. */
  async setPersistence(id: string, persist: boolean): Promise<DocumentRecord> {
    const blob = await this.getBlob(id);
    if (!blob) {
      throw new DocumentError("missing_blob", `No blob available for document ${id}`);
    }
    const sessionDoc = this.session.get(id);
    const persisted = sessionDoc ? undefined : await this.db.documents.get(id);
    const existing = sessionDoc?.record ?? persisted;
    if (!existing) {
      throw new DocumentError("not_found", `Document ${id} not found`);
    }

    if (persist) {
      const record: DocumentRecord = { ...existing, storageMode: "indexeddb", blob };
      await this.db.documents.put(record);
      this.session.delete(id);
      return record;
    }

    await this.db.documents.delete(id);
    const record: DocumentRecord = { ...existing, storageMode: "session", blob: undefined };
    this.session.set(id, { record, blob });
    return record;
  }
}
