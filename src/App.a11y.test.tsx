import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import axe from "axe-core";
import App from "./App";

/**
 * Accessibility gate (TASK-053, DESIGN.md): the shell must pass axe with
 * no serious/critical violations. Pages with dynamic content get their own
 * checks as they gain features.
 */
async function expectNoSeriousViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // Color contrast cannot be measured reliably in jsdom without styles.
      "color-contrast": { enabled: false },
    },
  });
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map((v) => v.id + ": " + v.help + " [" + v.nodes.map((n) => n.target).join(",") + "]"),
  ).toEqual([]);
}

describe("accessibility", () => {
  it("App shell has no serious or critical axe violations", async () => {
    window.location.hash = "";
    const { container } = render(<App />);
    await expectNoSeriousViolations(container);
  });

  it("New Benchmark wizard has no serious or critical axe violations", async () => {
    window.location.hash = "#/new-benchmark";
    const { container } = render(<App />);
    await expectNoSeriousViolations(container);
  });

  it("Runs & Results has no serious or critical axe violations", async () => {
    window.location.hash = "#/runs";
    const { container } = render(<App />);
    await expectNoSeriousViolations(container);
  });

  it("Compare has no serious or critical axe violations", async () => {
    window.location.hash = "#/compare";
    const { container } = render(<App />);
    await expectNoSeriousViolations(container);
  });

  it("Library has no serious or critical axe violations", async () => {
    window.location.hash = "#/library";
    const { container } = render(<App />);
    await expectNoSeriousViolations(container);
  });

  it("Settings has no serious or critical axe violations", async () => {
    window.location.hash = "#/settings";
    const { container } = render(<App />);
    await expectNoSeriousViolations(container);
  });
});
