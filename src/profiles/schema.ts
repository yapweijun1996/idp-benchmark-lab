import Ajv from "ajv";
import { canonicalJson } from "../evaluation/canonical";

// Strict mode + explicit keyword whitelist: canonical schemas are standard
// draft-07; provider dialects (e.g. OpenAI "nullable") are rejected
// (docs/JSON_SCHEMA.md).
const ajv = new Ajv({ strict: true, allErrors: true });

export interface SchemaCheck {
  valid: boolean;
  errors: string[];
}

/** Every keyword defined by JSON Schema draft-07. */
const DRAFT07_KEYWORDS = new Set([
  "$id", "$schema", "$ref", "$comment",
  "title", "description", "default", "readOnly", "writeOnly", "examples",
  "multipleOf", "maximum", "exclusiveMaximum", "minimum", "exclusiveMinimum",
  "maxLength", "minLength", "pattern",
  "additionalItems", "items", "maxItems", "minItems", "uniqueItems", "contains",
  "maxProperties", "minProperties", "required", "additionalProperties",
  "definitions", "properties", "patternProperties", "dependencies", "propertyNames",
  "const", "enum", "type", "format", "contentMediaType", "contentEncoding",
  "if", "then", "else", "allOf", "anyOf", "oneOf", "not",
]);

const SCHEMA_VALUED_KEYS = [
  "items", "additionalItems", "contains", "propertyNames", "if", "then", "else", "not", "additionalProperties",
] as const;

const SCHEMA_MAP_KEYS = ["properties", "patternProperties", "definitions"] as const;

const SCHEMA_ARRAY_KEYS = ["allOf", "anyOf", "oneOf"] as const;

/** Recursively collects unknown (non-draft-07) keywords with their JSON paths. */
export function findUnknownKeywords(schema: unknown): string[] {
  const found: string[] = [];
  walk(schema, "$", found);
  return found;
}

function walk(node: unknown, path: string, found: string[]): void {
  // Boolean schemas (true/false) are valid draft-07 schemas.
  if (typeof node === "boolean") {
    return;
  }
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return;
  }
  const record = node as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (!DRAFT07_KEYWORDS.has(key)) {
      found.push(`${path}.${key}`);
    }
  }

  for (const key of SCHEMA_VALUED_KEYS) {
    const child = record[key];
    if (child !== null && typeof child === "object") {
      walk(child, `${path}.${key}`, found);
    }
  }
  for (const key of SCHEMA_MAP_KEYS) {
    const map = record[key];
    if (map !== null && typeof map === "object" && !Array.isArray(map)) {
      for (const childKey of Object.keys(map as Record<string, unknown>)) {
        walk((map as Record<string, unknown>)[childKey], `${path}.${key}.${childKey}`, found);
      }
    }
  }
  for (const key of SCHEMA_ARRAY_KEYS) {
    const list = record[key];
    if (Array.isArray(list)) {
      list.forEach((child, index) => walk(child, `${path}.${key}[${index}]`, found));
    }
  }
}

/** Compile-check a JSON Schema itself (well-formed draft-07, no dialect keywords). */
export function validateJsonSchema(schema: unknown): SchemaCheck {
  const unknown = findUnknownKeywords(schema);
  if (unknown.length > 0) {
    return { valid: false, errors: unknown.map((p) => `${p}: unknown keyword (not standard JSON Schema draft-07)`) };
  }
  try {
    ajv.compile(schema as object);
    return { valid: true, errors: [] };
  } catch (e) {
    return { valid: false, errors: [formatError(e)] };
  }
}

/** Validate a data document against a compiled JSON Schema. */
export function validateData(data: unknown, schema: unknown): SchemaCheck {
  try {
    const validate = ajv.compile(schema as object);
    if (validate(data)) {
      return { valid: true, errors: [] };
    }
    return {
      valid: false,
      errors: (validate.errors ?? []).map((err) => {
        const path = err.instancePath || "/";
        const extra =
          typeof err.params === "object" &&
          err.params !== null &&
          "additionalProperty" in err.params
            ? ` (${String(err.params.additionalProperty)})`
            : "";
        return `${path} ${err.message ?? "invalid"}${extra}`;
      }),
    };
  } catch (e) {
    return { valid: false, errors: [formatError(e)] };
  }
}

/** Stable hash source for a schema (identity snapshot, docs/BENCHMARK_IDENTITY.md). */
export function schemaHashSource(schema: unknown): string {
  return canonicalJson(schema);
}

function formatError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
