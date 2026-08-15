import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders main navigation and the default dashboard page", () => {
    window.location.hash = "";
    render(<App />);
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
  });

  it("navigates to a page when the hash points to a known route", () => {
    window.location.hash = "#/providers";
    render(<App />);
    expect(screen.getByRole("heading", { name: /providers/i })).toBeInTheDocument();
  });
});
