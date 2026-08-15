# Benchmark Identity

A repeatability/stability claim is valid only when the configuration is fixed.

Identity must include:
- document SHA-256
- extraction profile ID/version
- prompt SHA-256
- JSON schema SHA-256
- normalization policy hash (when a policy is configured)
- Golden Answer SHA-256/version
- provider
- model ID
- thinking/reasoning setting
- temperature and other decoding settings
- input mode
- renderer settings
- concurrency
- retry policy version
- application build/version

Changing any identity field creates a different benchmark configuration.

Example lesson: Gemini 3.5 Flash Lite with `Thinking=Minimal` and the same model with `Thinking=Medium` must be stored and compared as different configurations.
