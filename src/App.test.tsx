import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders main navigation and the default home page", () => {
    window.location.hash = "";
    render(<App />);
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /home/i })).toBeInTheDocument();
  });

  it("navigates to a page when the hash points to a known route", () => {
    window.location.hash = "#/compare";
    render(<App />);
    expect(screen.getByRole("heading", { name: /^compare$/i })).toBeInTheDocument();
  });

  it("redirects a pre-redesign hash to its new task-oriented route", () => {
    window.location.hash = "#/providers";
    render(<App />);
    expect(screen.getByRole("heading", { name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^ai providers$/i })).toBeInTheDocument();
  });
});
