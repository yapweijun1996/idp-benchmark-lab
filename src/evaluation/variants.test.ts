import { describe, expect, it } from "vitest";
import { groupVariants } from "./variants";

describe("groupVariants", () => {
  it("groups parseable runs by hash with percentages", () => {
    const groups = groupVariants([
      { runNumber: 1, outputHash: "a" },
      { runNumber: 2, outputHash: "a" },
      { runNumber: 3, outputHash: "b" },
      { runNumber: 4, outputHash: undefined }, // parse failure
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ hash: "a", count: 2, representativeRunNumber: 1 });
    expect(groups[0]?.percentage).toBeCloseTo(2 / 3);
    expect(groups[1]).toMatchObject({ hash: "b", count: 1, percentage: 1 / 3 });
  });

  it("sorts by frequency then first run number", () => {
    const groups = groupVariants([
      { runNumber: 5, outputHash: "x" },
      { runNumber: 1, outputHash: "y" },
      { runNumber: 2, outputHash: "y" },
      { runNumber: 3, outputHash: "x" },
    ]);
    expect(groups.map((g) => g.hash)).toEqual(["y", "x"]);
    expect(groups[0]?.representativeRunNumber).toBe(1);
  });

  it("returns no groups when nothing is parseable", () => {
    expect(groupVariants([{ runNumber: 1 }, { runNumber: 2 }])).toEqual([]);
  });
});
