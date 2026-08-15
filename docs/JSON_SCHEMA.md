# JSON Schema Rules

Structured output schema is part of benchmark identity.

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
