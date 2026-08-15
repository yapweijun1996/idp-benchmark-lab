/**
 * Flattens a JSON value into leaf paths (EVALUATION.md leaf-field accuracy).
 * Objects join keys with ".", arrays join indexes with "[n]".
 * null is a leaf value, never skipped.
 */
export function flattenLeaves(value: unknown): Map<string, unknown> {
  const leaves = new Map<string, unknown>();
  walk(value, "", leaves);
  return leaves;
}

function walk(node: unknown, path: string, leaves: Map<string, unknown>): void {
  if (Array.isArray(node)) {
    node.forEach((child, index) => walk(child, `${path}[${index}]`, leaves));
    return;
  }
  if (node !== null && typeof node === "object") {
    for (const key of Object.keys(node as Record<string, unknown>)) {
      const child = (node as Record<string, unknown>)[key];
      walk(child, path ? `${path}.${key}` : key, leaves);
    }
    return;
  }
  leaves.set(path, node);
}
