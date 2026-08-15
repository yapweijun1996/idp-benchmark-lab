import { describe, expect, it } from "vitest";
import { sha256Hex } from "./hash";

const encoder = new TextEncoder();

describe("sha256Hex", () => {
  it("hashes empty input to the well-known SHA-256 value", async () => {
    // TextEncoder produces bytes in jsdom's own realm, which SubtleCrypto accepts.
    const empty = encoder.encode("").buffer;
    await expect(sha256Hex(empty)).resolves.toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes 'abc' to the well-known SHA-256 value", async () => {
    await expect(sha256Hex(encoder.encode("abc").buffer)).resolves.toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is deterministic for the same bytes", async () => {
    const bytes = encoder.encode("golden-po.pdf").buffer;
    const [a, b] = await Promise.all([sha256Hex(bytes), sha256Hex(bytes)]);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
