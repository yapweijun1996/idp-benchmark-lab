# EPIC — IDP Benchmark Lab

## Status model

- `delivered` — the spike capability exists in the current codebase.
- `partial` — the main capability exists, but a required correctness, safety, or evidence guarantee is open.
- `open` — the production acceptance outcome has not been achieved.

Historical delivery is not production sign-off. Current remediation status is owned by [TASK.md](TASK.md), and dated evidence is owned by [PROJECT_STATUS.md](PROJECT_STATUS.md).

| Epic | Goal | Status | Current qualification |
| --- | --- | --- | --- |
| EPIC-001 Foundation & Static PWA | Responsive React/Vite/TypeScript PWA, local persistence, build metadata, and GitHub Pages workflow | partial | Static build, manifest, service worker, and workflow exist. The database remains schema v1 with no later upgrade handler; live Pages, full PWA lifecycle, cross-browser behavior, and interruption recovery also remain unverified (TASK-061/068). |
| EPIC-002 Documents, Templates & Expected Results | PDF upload/preview, two input modes, prompt/schema templates, Expected Results, and fingerprints | partial | Editing and validation exist, including two bundled samples and a visual schema editor. Profile/Expected Result versions overwrite the same IDs, so historical evidence is not immutable (TASK-061). |
| EPIC-003 Provider Abstraction & BYOK | OpenAI, Gemini, and Custom OpenAI-compatible adapters with capability checks, usage, settings, pricing, and credential safety | partial | Adapters and connection diagnostics exist. Custom auth headers can persist/export, live-origin CORS is unverified, and pricing association/configuration is incomplete (TASK-058/064/068). |
| EPIC-004 Benchmark Runner | Single and 5/10/20/50/100-run execution with concurrency, bounded retry, Stop, budget, and persistence | partial | Queueing and evidence persistence exist. Stop is not checked before retries, and the current budget estimator is not a hard cap under first/unknown/concurrent requests (TASK-059/060). |
| EPIC-005 Evaluation & Stability Analytics | Schema, exact, leaf/row, strict/normalized, variant, heatmap, latency, and cost analysis | partial | Deterministic strict evaluation, variants, heatmap, latency, and basic cost summaries exist. Normalized results are discarded after evaluation; parse-failure evidence and some documented cost/error metrics are incomplete (TASK-063/065). |
| EPIC-006 Results, Compare & Portability | Result inspection, comparison, JSON/CSV export, and project backup/restore | partial | The UI and export paths exist, but history views load only the latest 20 suites, mutable references can relabel old results, and backup secret/schema validation is incomplete (TASK-058/061/062/070). |
| EPIC-007 Security, QA & Release | Enforced secret boundaries, reliable gates, dependency review, accessibility, and production release evidence | open | Lint/typecheck/build pass with warnings, but Vitest and three obsolete Home E2E cases fail. Security, dependency, live-provider, browser, PWA, stress, and interruption gates remain open (TASK-058/066..068). |
| EPIC-008 Guided Workflow & Localization | Six-item task navigation, six-step wizard, bundled samples, provider reasoning controls, and localized UI | partial | The guided workflow is active. English, Mandarin, Malay, Japanese, and Vietnamese are selectable with English/key fallback; coverage is incomplete, the retired inline demo remains as dead source/tests, and Home's 3-run recommendation conflicts with supported repeated presets (TASK-066/070). |
| EPIC-009 Production-Readiness Remediation | Close review findings without adding a backend or weakening benchmark contracts | open | TASK-058..068 and TASK-070 define the remaining implementation and acceptance work. Production decision remains **NO-GO**. |
