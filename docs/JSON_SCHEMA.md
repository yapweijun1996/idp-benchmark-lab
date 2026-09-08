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

Current adapters do not persist a translated provider-schema snapshot/hash. OpenAI requests `json_object`, Gemini requests `application/json`, and Custom OpenAI-compatible requests JSON-object mode only for supported Chat Completions configurations; canonical validation is performed locally with AJV after parsing. Model/provider enforcement must not be inferred from local schema validity.

Expected result should be direct JSON root. Avoid artificial wrappers such as:

```json
{"response":"{...json string...}"}
```

Provider schema translation, when added, must be tested and recorded with a translated-schema hash/snapshot. This is a target requirement, not a current persisted field (TASK-061).

Canonical schema definitions with unsupported keywords such as `nullable` are rejected by strict schema-definition validation. Any future provider-dialect translation belongs only at the adapter boundary; parsed output is still validated locally against the unchanged canonical schema.
