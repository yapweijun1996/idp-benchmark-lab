import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { UpdatePrompt } from "./UpdatePrompt";

const registerState = vi.hoisted(() => ({
  needRefresh: [false, false] as [boolean, boolean],
  updateServiceWorker: vi.fn(async () => undefined),
  onNeedRefresh: undefined as (() => void) | undefined,
}));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: (options?: { onNeedRefresh?: () => void }) => {
    registerState.onNeedRefresh = options?.onNeedRefresh;
    return registerState;
  },
}));

function renderPrompt() {
  return render(
    <I18nProvider>
      <UpdatePrompt />
    </I18nProvider>,
  );
}

describe("UpdatePrompt", () => {
  beforeEach(() => {
    registerState.needRefresh = [false, false];
    registerState.updateServiceWorker.mockClear();
    registerState.onNeedRefresh = undefined;
  });

  it("stays hidden until the service worker reports a refresh", () => {
    renderPrompt();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the current friendly version and waits for explicit acceptance", () => {
    registerState.needRefresh = [true, false];
    renderPrompt();

    expect(screen.getByRole("status")).toHaveTextContent("A new app build is available.");
    expect(screen.getByRole("status")).toHaveTextContent("Current app version: v0.1.0");
    expect(screen.getByRole("button", { name: "Update & reload" })).toHaveTextContent("(v0.1.0)");
    expect(registerState.updateServiceWorker).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Update & reload" }));
    expect(registerState.updateServiceWorker).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("dismisses the prompt and reopens it for a later refresh event", () => {
    registerState.needRefresh = [true, false];
    const view = renderPrompt();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => registerState.onNeedRefresh?.());
    view.rerender(<I18nProvider><UpdatePrompt /></I18nProvider>);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
