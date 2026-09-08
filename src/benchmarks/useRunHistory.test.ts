import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { getDb } from "../storage/db";
import { useRunHistory } from "./useRunHistory";
import type { BenchmarkSuite } from "../storage/types";

afterEach(async () => { await getDb().benchmarkSuites.clear(); });
it("exposes more than twenty retained suites and observes recovery updates", async () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: `history-${i}`, createdAt: new Date(2026, 0, i + 1).toISOString(), status: "running" } as BenchmarkSuite));
  await getDb().benchmarkSuites.bulkPut(rows);
  const { result, unmount } = renderHook(() => useRunHistory());
  await waitFor(() => expect(result.current.suites).toHaveLength(25));
  expect(result.current.suites[0]?.id).toBe("history-24");
  await act(async () => { await getDb().benchmarkSuites.update("history-24", { status: "failed" }); });
  await waitFor(() => expect(result.current.suites[0]?.status).toBe("failed"));
  unmount();
});
