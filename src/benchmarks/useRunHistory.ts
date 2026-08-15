import { useCallback, useEffect, useState } from "react";
import { getDb } from "../storage/db";
import type { BenchmarkSuite } from "../storage/types";

export interface UseRunHistoryResult {
  suites: BenchmarkSuite[];
  loading: boolean;
  refresh: () => Promise<void>;
}

/** Recent benchmark suites, newest first (single runs included). */
export function useRunHistory(): UseRunHistoryResult {
  const [suites, setSuites] = useState<BenchmarkSuite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const db = getDb();
      const all = await db.benchmarkSuites.toArray();
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSuites(all.slice(0, 20));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { suites, loading, refresh };
}
