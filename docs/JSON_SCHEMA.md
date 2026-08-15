# JSON Schema Rules

Structured output schema is part of benchmark identity.

Canonical app schemas use JSON Schema **draft-07**, validated with AJV in strict mode. See `examples/json-schema-canonical.example.json`. The file `examples/structured-output-schema-openapi.example.json` is an OpenAI structured-outputs dialect example (`nullable` is not valid standard JSON Schema) and is a translation target, never the canonical schema.

Requirements:
- store exact canonical app schema snapshot
- hash schema
- validate Golden Answer
- validate each output
- do not silently coerce before validation

Provider schema dialects differ. Provider adapters may translate the canonical app schema to provider-specific syntax, but the canonical schema remains provider-neutral.

Expected result should be direct JSON root. Avoid artificial wrappers such as:

```json
{"response":"{...json string...}"}
```

Provider schema translation must be tested and, if materially different, recorded with a translated-schema hash/snapshot.

Unknown keywords such as `nullable` must never reach the canonical AJV validator; adapters translate before validation or the run is reported schema-invalid.
