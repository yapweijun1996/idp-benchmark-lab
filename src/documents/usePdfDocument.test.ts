import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePdfDocument, type PdfLoader } from "./usePdfDocument";

// The loader is injected, so this test never touches pdfjs-dist.
const fakeDoc = { numPages: 2, destroy: vi.fn(), getPage: vi.fn() };

function blob(): Blob {
  return new Blob(["%PDF-1.4 mock"], { type: "application/pdf" });
}

function loaderFor(numPages: number, rejectWith?: Error): PdfLoader {
  return vi.fn(() => ({
    promise: rejectWith ? Promise.reject(rejectWith) : Promise.resolve({ ...fakeDoc, numPages }),
    destroy: vi.fn(() => Promise.resolve()),
  })) as unknown as PdfLoader;
}

describe("usePdfDocument", () => {
  it("stays idle without a blob", () => {
    const loader = loaderFor(0);
    const { result } = renderHook(() => usePdfDocument(undefined, loader));
    expect(result.current).toMatchObject({ numPages: 0, loading: false, error: null });
  });

  it("loads page count from a PDF blob", async () => {
    const loader = loaderFor(13);
    const doc = blob();
    const { result } = renderHook(() => usePdfDocument(doc, loader));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.numPages).toBe(13);
    expect(result.current.error).toBeNull();
    expect(loader).toHaveBeenCalledWith({ data: expect.any(ArrayBuffer) });
  });

  it("reports load failures", async () => {
    const loader = loaderFor(0, new Error("invalid pdf"));
    const doc = blob();
    const { result } = renderHook(() => usePdfDocument(doc, loader));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("invalid pdf");
    expect(result.current.numPages).toBe(0);
  });

  it("loads only the latest blob when the blob changes quickly", async () => {
    const loader = vi.fn(() => ({
      promise: Promise.resolve({ ...fakeDoc, numPages: 2 }),
      destroy: vi.fn(() => Promise.resolve()),
    })) as unknown as PdfLoader;

    const first = blob();
    const second = blob();
    const { result, rerender } = renderHook(({ b }: { b: Blob }) => usePdfDocument(b, loader), {
      initialProps: { b: first },
    });
    rerender({ b: second });
    await waitFor(() => expect(result.current.numPages).toBe(2));
    // 旧 blob 的读取在 rerender 时被取消：loader 只为最新 blob 调用一次。
    await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
    expect(result.current.error).toBeNull();
  });
});
