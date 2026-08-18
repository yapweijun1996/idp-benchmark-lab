import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App shell", () => {
  it("renders main navigation and the default home page", () => {
    window.location.hash = "";
    render(<App />);
    expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveTextContent(/local-first/i);
    expect(screen.getByRole("main")).toHaveTextContent(/workspace.*home/i);
    expect(screen.getByRole("heading", { name: /home/i })).toBeInTheDocument();
  });

  it("navigates to a page when the hash points to a known route", () => {
    window.location.hash = "#/compare";
    render(<App />);
    expect(screen.getByRole("heading", { name: /^compare$/i })).toBeInTheDocument();
  });

  it("toggles the sidebar from the topbar", () => {
    window.location.hash = "";
    render(<App />);

    const toggle = screen.getByRole("button", { name: /hide sidebar/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const sidebar = document.getElementById("app-sidebar");
    expect(sidebar).not.toBeNull();
    expect(sidebar).not.toHaveClass("sidebar--hidden");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: /show sidebar/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(sidebar?.parentElement).toHaveClass("app-shell--sidebar-hidden");
  });

  it("redirects a pre-redesign hash to its new task-oriented route", () => {
    window.location.hash = "#/providers";
    render(<App />);
    expect(screen.getByRole("heading", { name: /^settings$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^ai providers$/i })).toBeInTheDocument();
  });
});
