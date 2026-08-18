import type { DocumentRecord } from "../storage/types";

type SessionDocument = {
  record: DocumentRecord;
  blob: Blob;
};

// Session-only uploads intentionally disappear on a full page reload, but
// must be visible to every service instance during the current app session.
const sessionDocuments = new Map<string, SessionDocument>();

export function registerSessionDocument(record: DocumentRecord, blob: Blob): void {
  sessionDocuments.set(record.id, { record, blob });
}

export function getSessionDocument(id: string): DocumentRecord | undefined {
  return sessionDocuments.get(id)?.record;
}

export function getSessionDocumentBlob(id: string): Blob | undefined {
  return sessionDocuments.get(id)?.blob;
}

export function updateSessionDocument(record: DocumentRecord): void {
  const current = sessionDocuments.get(record.id);
  if (current) {
    sessionDocuments.set(record.id, { ...current, record });
  }
}

export function removeSessionDocument(id: string): void {
  sessionDocuments.delete(id);
}
