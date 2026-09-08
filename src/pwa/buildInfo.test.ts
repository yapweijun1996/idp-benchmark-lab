import { describe, expect, it } from "vitest";
import { formatFriendlyVersion, parseBuildIdentity } from "./buildInfo";

describe("build identity", () => {
  it("separates the friendly package version from the full identity", () => {
    expect(parseBuildIdentity("0.1.0+abc123.deadbeef")).toEqual({
      version: "0.1.0",
      buildIdentity: "0.1.0+abc123.deadbeef",
    });
  });

  it("preserves prerelease versions and tolerates a plain version", () => {
    expect(parseBuildIdentity("1.2.3-beta.1+revision.build").version).toBe("1.2.3-beta.1");
    expect(parseBuildIdentity("1.2.3").buildIdentity).toBe("1.2.3");
  });

  it("uses a safe fallback when build metadata is unavailable", () => {
    expect(parseBuildIdentity(undefined)).toEqual({ version: "0.1.0", buildIdentity: "0.1.0" });
    expect(formatFriendlyVersion("")).toBe("v0.1.0");
    expect(formatFriendlyVersion("v2.0.0")).toBe("v2.0.0");
  });
});
