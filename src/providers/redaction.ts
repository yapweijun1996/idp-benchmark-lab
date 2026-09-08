/** Runtime credentials are never evidence. Keep values for in-flight redaction after Stop/delete. */
const credentials = new Set<string>();
export function clearRedactionCredentials(): void { credentials.clear(); }
export function forgetCredential(value: string): void {
  credentials.delete(value);
  credentials.delete(value.replace(/^(?:Bearer|Basic)\s+/i, ""));
}
export function captureRedactor(): <T>(value: T) => T {
  const captured = new Set(credentials);
  return <T>(value: T) => redact(value, captured);
}
const secretName = /^(?:authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|x[-_].*(?:key|token|secret)|access[-_]?token|refresh[-_]?token|client[-_]?secret)$/i;
export function rememberCredential(value: string): void {
  if (!value) return;
  credentials.add(value);
  const token = value.replace(/^(?:Bearer|Basic)\s+/i, "");
  if (token) credentials.add(token);
}
export function redactText(text: string, values: ReadonlySet<string> = credentials): string {
  let safe = text;
  for (const value of [...values].sort((a, b) => b.length - a.length)) {
    for (const encoded of new Set([value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1)])) {
      safe = safe.split(encoded).join("[REDACTED]");
    }
  }
  return safe
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/gi, "[REDACTED]")
    // Provider/gateway credential prefixes must be safe even when an error is
    // captured before the runtime credential registry sees the value.
    .replace(/\b(?:dmo|gw|sk)_[A-Za-z0-9._~+/-]+=*/gi, "[REDACTED]")
    .replace(/("(?:authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|x[-_][\w-]*(?:key|token|secret)|access[-_]?token|refresh[-_]?token|client[-_]?secret)"\s*:\s*")[^"\r\n]*/gi, "$1[REDACTED]")
    .replace(/(https?:\/\/)[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/([?&](?:api[-_]?key|access[-_]?token|token|secret|password)=)[^&#\s"]+/gi, "$1[REDACTED]");
}
export function collectCredentials(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if ((secretName.test(key.split(".").at(-1)!) || key.includes("customHeaders.")) && typeof child === "string" && child !== "[REDACTED]") rememberCredential(child);
    if (key === "customHeaders" && child && typeof child === "object") {
      for (const header of Object.values(child)) if (typeof header === "string") rememberCredential(header);
    }
    collectCredentials(child);
  }
}
/** Preserve binary document payloads, redact recursively including serialized response envelopes. */
export function redact<T>(value: T, values: ReadonlySet<string> = credentials): T {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        const safe = JSON.stringify(redact(parsed, values));
        return (safe === JSON.stringify(parsed) ? redactText(value, values) : safe) as T;
      }
    } catch { /* Plain text and malformed JSON are still redacted below. */ }
    return redactText(value, values) as T;
  }
  if (Array.isArray(value)) return value.map((child) => redact(child, values)) as T;
  if (!value || typeof value !== "object" || ["[object Blob]", "[object File]", "[object ArrayBuffer]"].includes(Object.prototype.toString.call(value))) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key, child === undefined ? undefined : /^(?:customHeaders|headers|requestHeaders|responseHeaders)$/i.test(key) ? {} : secretName.test(key.split(".").at(-1)!) || key.includes("customHeaders.") ? "[REDACTED]" : redact(child, values),
  ])) as T;
}
