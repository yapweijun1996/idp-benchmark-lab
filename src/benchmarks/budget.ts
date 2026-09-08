export class AttemptBlocked extends Error {}

/** All amounts round outwards to nanodollars; reservations are synchronous across workers. */
export class AttemptBudget {
  private reserved = 0;
  private charged = 0;
  private breached = false;
  private readonly cap?: number;
  private readonly bound?: number;
  constructor(capUsd?: number, boundUsd?: number) {
    if (capUsd !== undefined && (!Number.isFinite(capUsd) || capUsd < 0)) throw new Error("Budget must be finite and nonnegative.");
    if (boundUsd !== undefined && (!Number.isFinite(boundUsd) || boundUsd < 0)) throw new Error("Attempt bound must be finite and nonnegative.");
    this.cap = capUsd === undefined ? undefined : Math.floor(capUsd * 1e9);
    this.bound = boundUsd === undefined ? undefined : Math.ceil(boundUsd * 1e9);
    if ((this.cap !== undefined && !Number.isSafeInteger(this.cap)) || (this.bound !== undefined && !Number.isSafeInteger(this.bound))) throw new Error("Budget exceeds the supported range.");
  }
  get reason(): string | undefined {
    if (this.cap === undefined) return undefined;
    if (this.breached) return "Provider cost exceeded its declared bound; further attempts are blocked.";
    if (this.bound === undefined) return "Hard budget requires a documented maximum cost per attempt; no safe bound is configured.";
    if (this.charged + this.reserved + this.bound > this.cap) return "Hard budget has insufficient unreserved funds for another attempt.";
    return undefined;
  }
  reserve(): (costUsd?: number) => void {
    const reason = this.reason;
    if (reason) throw new AttemptBlocked(reason);
    const reservation = this.cap === undefined ? 0 : this.bound!;
    this.reserved += reservation;
    let settled = false;
    return (costUsd) => {
      if (settled) throw new Error("Attempt reservation already settled.");
      settled = true;
      this.reserved -= reservation;
      const actual = costUsd !== undefined && Number.isFinite(costUsd) && costUsd >= 0 ? Math.ceil(costUsd * 1e9) : undefined;
      // A lost response may still be billed. Never release unknown liability.
      this.charged += actual ?? reservation;
      if (this.cap !== undefined && actual !== undefined && actual > reservation) this.breached = true;
    };
  }
}
