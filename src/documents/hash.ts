/** SHA-256 hex digest of raw bytes (Web Crypto), used for document fingerprints. */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  // Copy bytes with the current realm's Uint8Array: jsdom's SubtleCrypto
  // rejects buffers produced by FileReader even when instanceof passes.
  const copy = new Uint8Array(data.byteLength);
  copy.set(new Uint8Array(data));
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
