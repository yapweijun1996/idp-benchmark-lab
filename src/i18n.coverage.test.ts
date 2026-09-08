// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./i18n";
import { I18N_KEY_REGISTRY, getI18nCoverage } from "./i18nCatalog";

const sourceRoot = dirname(fileURLToPath(import.meta.url));

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) && !/\.test\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function literalTranslationKeys(): string[] {
  const keyPattern = /\bt\(\s*["']([^"']+)["']\s*\)/g;
  const keys = new Set<string>();
  for (const path of sourceFiles(sourceRoot)) {
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(keyPattern)) {
      const key = match[1];
      if (key) keys.add(key);
    }
  }
  return [...keys].sort();
}

describe("canonical i18n registry", () => {
  it("contains every literal UI translation call", () => {
    const missing = literalTranslationKeys().filter((key) => !I18N_KEY_REGISTRY.includes(key));
    expect(missing).toEqual([]);
  });

  it("has an explicit translation for every canonical key in every locale", () => {
    for (const { code } of LANGUAGES) {
      const coverage = getI18nCoverage(code);
      expect(coverage.missing, `${code} missing translations`).toEqual([]);
      expect(coverage.translated).toBe(coverage.total);
    }
  });
});
