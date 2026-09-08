import type { IdpDatabase } from "../storage/db";

/** A browser lock protects live suites from recovery in another tab. No network request is replayed. */
export async function withExecutionLease<T>(db: IdpDatabase, action: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) return navigator.locks.request(`idp-execution:${db.name}`, action);
  return action();
}
export async function recoverInterrupted(db: IdpDatabase): Promise<number> {
  if (typeof navigator === "undefined" || !navigator.locks) return 0;
  return navigator.locks.request(`idp-execution:${db.name}`, { ifAvailable: true }, async (lock) => lock ? recoverAbandonedRecords(db) : 0);
}
/** Called only while owning the execution lock (or explicitly in isolated persistence tests). */
export async function recoverAbandonedRecords(db: IdpDatabase): Promise<number> {
  return db.transaction("rw", db.benchmarkSuites, db.benchmarkRuns, async () => {
    const suites = await db.benchmarkSuites.where("status").equals("running").toArray();
    const finishedAt = new Date().toISOString();
    for (const suite of suites) {
      const rows = await db.benchmarkRuns.where("suiteId").equals(suite.id).toArray();
      for (const run of rows) if (run.state === "running" || run.state === "queued") {
        await db.benchmarkRuns.put({ ...run, state: "cancelled", finishedAt, error: { category: "unknown", message: "Execution interrupted. A dispatched request may still be billed; it was not retried automatically.", retryable: false } });
      }
      await db.benchmarkSuites.put({ ...suite, status: "failed", finishedAt, stopReason: "Execution interrupted; retained evidence may be incomplete. No automatic replay." });
    }
    return suites.length;
  });
}
