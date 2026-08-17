import { describe, expect, it } from "vitest";
import { browserExecuteDeps } from "./runtimeDeps";

describe("browserExecuteDeps", () => {
  it("supplies a pdfLoader and pageRenderer so canonical_images mode does not throw", () => {
    // Regression: execute.ts's buildRequest() throws "PDF loader unavailable"
    // whenever deps.pdfLoader is missing, and previously nothing in
    // production ever supplied one — canonical_images mode (OpenAI /
    // OpenAI-compatible, which require image input) silently could never
    // run outside tests that injected a fake loader.
    const deps = browserExecuteDeps();
    expect(deps.pdfLoader).toBeTypeOf("function");
    expect(deps.pageRenderer).toBeDefined();
    expect(deps.pageRenderer!.render).toBeTypeOf("function");
  });
});
