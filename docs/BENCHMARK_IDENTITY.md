# Benchmark Identity

A repeatability/stability claim is valid only when the configuration is fixed.

New suites store effective PDF bytes, rendered canonical images, prompt/schema overrides, complete selected profile/Golden versions, endpoint/settings, pricing and execution settings. The snapshot digest joins the existing identity fields. Build identity contains package version, Git revision and a unique UUID. Historical inspectors never dereference a mutable Golden ID for new suites; legacy missing evidence is labelled unavailable.

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
