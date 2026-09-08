# Benchmark Identity

A repeatability/stability claim is valid only when the configuration is fixed.

Current implementation does not meet the complete immutable-evidence requirement: profiles/Golden Answers overwrite prior versions, historical inspectors fetch mutable IDs, complete prompt/schema overrides are not retained, custom endpoint/API settings are missing from identity, and app build identifies only the package version. TASK-061 owns remediation; see [review R4](reviews/2026-09-08-production-readiness.md#r4--p1-historical-benchmark-evidence-is-not-immutable).

Identity must include:
- document SHA-256
- extraction profile ID/version
- prompt SHA-256
- JSON schema SHA-256
- normalization policy hash (when a policy is configured)
- Golden Answer SHA-256/version
- provider kind, effective endpoint, API style and non-secret request settings
- model ID
- thinking/reasoning setting
- temperature and other decoding settings
- input mode
- renderer settings
- concurrency
- retry policy version
- unique application build identifier and version

Changing any identity field creates a different benchmark configuration.

Freeze the effective values needed to reconstruct the run, not only their hashes or mutable record IDs. Applied pricing must also be frozen and retained for cost audit (TASK-064). Never include authentication values in a configuration snapshot.

Example lesson: Gemini 3.5 Flash Lite with `Thinking=Minimal` and the same model with `Thinking=Medium` must be stored and compared as different configurations.
