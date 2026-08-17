import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfilesPage } from "./ProfilesPage";
import { useProfiles, type UseProfilesResult } from "../profiles/useProfiles";
import type { ExtractionProfile } from "../storage/types";

vi.mock("../profiles/useProfiles", () => ({ useProfiles: vi.fn() }));

const useProfilesMock = vi.mocked(useProfiles);

const profile: ExtractionProfile = {
  id: "p-1",
  name: "Golden PO reduced",
  description: "Popular PO",
  version: 1,
  basePrompt: "Extract printed values only.",
  extractionContract: { doc_info: ["document_number"] },
  jsonSchema: {
    type: "object",
    properties: { document_number: { type: ["string", "null"] } },
    required: ["document_number"],
    additionalProperties: false,
  },
  promptSha256: "aaaa1111222233334444",
  schemaSha256: "bbbb1111222233334444",
  createdAt: "2026-08-15T00:00:00.000Z",
  updatedAt: "2026-08-15T00:00:00.000Z",
};

function emptyResult(): UseProfilesResult {
  return {
    profiles: [],
    activeId: undefined,
    loading: false,
    error: null,
    refresh: vi.fn(() => Promise.resolve()),
    create: vi.fn(() => Promise.resolve(profile)),
    update: vi.fn(() => Promise.resolve(profile)),
    remove: vi.fn(() => Promise.resolve()),
    select: vi.fn(),
  };
}

beforeEach(() => {
  useProfilesMock.mockReset();
});

describe("ProfilesPage", () => {
  it("renders empty state with a create button", () => {
    useProfilesMock.mockReturnValue(emptyResult());
    render(<ProfilesPage />);
    expect(screen.getByText(/no extraction templates yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new template/i })).toBeInTheDocument();
  });

  it("lists profiles with version and hashes", () => {
    useProfilesMock.mockReturnValue({ ...emptyResult(), profiles: [profile] });
    render(<ProfilesPage />);
    expect(screen.getByText(/golden po reduced/i)).toBeInTheDocument();
    expect(screen.getByText(/v1/)).toBeInTheDocument();
    expect(screen.getByText(/prompt aaaa111122…/)).toBeInTheDocument();
  });

  it("creates a profile from the form", async () => {
    const create = vi.fn(() => Promise.resolve(profile));
    useProfilesMock.mockReturnValue({ ...emptyResult(), create });
    render(<ProfilesPage />);
    fireEvent.click(screen.getByRole("button", { name: /new template/i }));

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "PO v2" } });
    fireEvent.change(screen.getByLabelText(/json schema/i), {
      target: { value: '{"type":"object","properties":{"a":{"type":"string"}}}' },
    });

    screen.getByRole("button", { name: /create template/i }).click();
    await vi.waitFor(() => expect(create).toHaveBeenCalled());
    expect(await screen.findByText(/✓ extraction template saved as version 1/i)).toBeInTheDocument();
  });

  it("shows schema validation status while editing", () => {
    useProfilesMock.mockReturnValue(emptyResult());
    render(<ProfilesPage />);
    fireEvent.click(screen.getByRole("button", { name: /new template/i }));
    // 空 schema 文本 → 解析失败状态
    expect(screen.getByRole("status").textContent).toMatch(/schema/i);
  });

  it("deletes a profile", () => {
    const remove = vi.fn(() => Promise.resolve());
    useProfilesMock.mockReturnValue({ ...emptyResult(), profiles: [profile], remove });
    render(<ProfilesPage />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(remove).toHaveBeenCalledWith("p-1");
  });
});
