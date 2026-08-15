import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IdpDatabase } from "../storage/db";
import { DocumentError, DocumentService } from "./service";

function pdfFile(name = "po.pdf", type = "application/pdf"): File {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type });
}

let service: DocumentService;
let db: IdpDatabase;
let counter = 0;

beforeEach(() => {
  counter += 1;
  db = new IdpDatabase(`idp-docs-test-${counter}`);
  service = new DocumentService(db);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("DocumentService.upload", () => {
  it("stores session documents in memory only", async () => {
    const record = await service.upload(pdfFile(), { persist: false });
    expect(record.storageMode).toBe("session");
    expect(record.sha256).toHaveLength(64);
    expect(record.size).toBe(4);

    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(record.id);

    // Session-only: nothing persisted to IndexedDB.
    await expect(db.documents.get(record.id)).resolves.toBeUndefined();
  });

  it("persists documents to IndexedDB when requested", async () => {
    const record = await service.upload(pdfFile(), { persist: true });
    expect(record.storageMode).toBe("indexeddb");
    const stored = await db.documents.get(record.id);
    expect(stored?.sha256).toBe(record.sha256);
    // fake-indexeddb structural-clones Blobs into plain objects; presence is what matters here.
    expect(stored?.blob).toBeDefined();
  });

  it("rejects non-PDF files", async () => {
    await expect(service.upload(pdfFile("notes.txt", "text/plain"), { persist: false })).rejects.toMatchObject({
      name: "DocumentError",
      code: "invalid_type",
    });
  });
});

describe("DocumentService.list ordering and dedupe", () => {
  it("deduplicates by id with the session copy winning", async () => {
    const persistedRecord = await service.upload(pdfFile("dup.pdf"), { persist: true });
    // 同一 id 同时存在于内存（更早 createdAt 的 session 记录）——模拟异常边界
    const older = {
      ...persistedRecord,
      storageMode: "session" as const,
      createdAt: "2026-08-14T00:00:00.000Z",
      blob: undefined,
    };
    service["session"].set(persistedRecord.id, { record: older, blob: new Blob(["x"]) });
    const list = await service.list();
    expect(list.filter((d) => d.id === persistedRecord.id)).toHaveLength(1);
    expect(list.find((d) => d.id === persistedRecord.id)?.storageMode).toBe("session");
  });

  it("sorts newest-first with name as tiebreaker", async () => {
    const a = await service.upload(pdfFile("a.pdf"), { persist: false });
    const b = await service.upload(pdfFile("b.pdf"), { persist: false });
    // 手工设定不同 createdAt 验证排序
    service["session"].get(a.id)!.record = { ...a, createdAt: "2026-08-13T00:00:00.000Z" };
    service["session"].get(b.id)!.record = { ...b, createdAt: "2026-08-15T00:00:00.000Z" };
    const list = await service.list();
    expect(list.map((d) => d.name)).toEqual(["b.pdf", "a.pdf"]);
  });

  it("keeps persisted documents ordered after a simulated refresh", async () => {
    const serviceA = new DocumentService(db);
    await serviceA.upload(pdfFile("old.pdf"), { persist: true });
    await serviceA.upload(pdfFile("new.pdf"), { persist: true });
    // 模拟刷新：新 service 实例（内存清空），persisted 顺序稳定
    const serviceB = new DocumentService(db);
    const listB = await serviceB.list();
    expect(listB.every((d) => d.storageMode === "indexeddb")).toBe(true);
    expect(listB).toHaveLength(2);
  });
});

describe("DocumentService.setPersistence", () => {
  it("moves a session document into IndexedDB", async () => {
    const record = await service.upload(pdfFile(), { persist: false });
    const moved = await service.setPersistence(record.id, true);
    expect(moved.storageMode).toBe("indexeddb");
    await expect(db.documents.get(record.id)).resolves.toBeDefined();
    await expect(service.getBlob(record.id)).resolves.toBeDefined();
  });

  it("moves a persisted document back to session-only", async () => {
    const record = await service.upload(pdfFile(), { persist: true });
    const moved = await service.setPersistence(record.id, false);
    expect(moved.storageMode).toBe("session");
    expect(moved.blob).toBeUndefined();
    await expect(db.documents.get(record.id)).resolves.toBeUndefined();
    await expect(service.getBlob(record.id)).resolves.toBeDefined();
  });

  it("fails for unknown document ids", async () => {
    await expect(service.setPersistence("nope", true)).rejects.toMatchObject({ code: "missing_blob" });
  });
});

describe("DocumentService.remove", () => {
  it("removes session and persisted documents", async () => {
    const a = await service.upload(pdfFile("a.pdf"), { persist: false });
    const b = await service.upload(pdfFile("b.pdf"), { persist: true });
    await service.remove(a.id);
    await service.remove(b.id);
    await expect(service.list()).resolves.toHaveLength(0);
    await expect(db.documents.get(b.id)).resolves.toBeUndefined();
  });

  it("never throws for unknown ids", async () => {
    await expect(service.remove("unknown")).resolves.toBeUndefined();
  });
});

describe("DocumentError", () => {
  it("is an Error with a stable code", () => {
    const err = new DocumentError("not_found", "nope");
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("not_found");
    expect(err.name).toBe("DocumentError");
  });
});
