import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useHashRoute } from "./useHashRoute";

function setHash(hash: string) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("useHashRoute", () => {
  it("returns the default route for an empty hash", () => {
    setHash("");
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("home");
  });

  it("parses a known route from the hash", () => {
    setHash("#/new-benchmark");
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("new-benchmark");
  });

  it("falls back to the default route for unknown hashes", () => {
    setHash("#/does-not-exist");
    const { result } = renderHook(() => useHashRoute());
    expect(result.current).toBe("home");
  });

  it("redirects pre-redesign hashes to their task-oriented route", () => {
    setHash("#/benchmarks");
    const { result: benchmarks } = renderHook(() => useHashRoute());
    expect(benchmarks.current).toBe("new-benchmark");

    setHash("#/documents");
    const { result: documents } = renderHook(() => useHashRoute());
    expect(documents.current).toBe("library");

    setHash("#/providers");
    const { result: providers } = renderHook(() => useHashRoute());
    expect(providers.current).toBe("settings");
  });

  it("updates the route when the hash changes", () => {
    setHash("");
    const { result } = renderHook(() => useHashRoute());
    act(() => {
      setHash("#/settings");
    });
    expect(result.current).toBe("settings");
  });
});
