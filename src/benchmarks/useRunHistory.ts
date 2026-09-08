import { useCallback, useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { getDb } from "../storage/db";
import type { BenchmarkSuite } from "../storage/types";

export interface UseRunHistoryResult {
  suites: BenchmarkSuite[];
  loading: boolean;
  refresh: () => Promise<void>;
}

/** All retained benchmark suites, newest first (single runs included). */
export function useRunHistory(): UseRunHistoryResult {
  const [suites, setSuites] = useState<BenchmarkSuite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const db = getDb();
      const all = await db.benchmarkSuites.toArray();
      all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSuites(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const subscription = liveQuery(() => getDb().benchmarkSuites.toArray()).subscribe({
      next: (all) => { setSuites(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setLoading(false); },
      error: () => setLoading(false),
    });
    return () => subscription.unsubscribe();
  }, []);

  return { suites, loading, refresh };
}
