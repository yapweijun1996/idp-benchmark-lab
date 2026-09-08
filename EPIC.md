# EPIC — IDP Benchmark Lab

## Status model

- `delivered` — the spike capability exists in the current codebase.
- `partial` — the main capability exists, but a required correctness, safety, or evidence guarantee is open.
- `open` — the production acceptance outcome has not been achieved.

Historical delivery is not production sign-off. Current remediation status is owned by [TASK.md](TASK.md), and dated evidence is owned by [PROJECT_STATUS.md](PROJECT_STATUS.md).

| Epic | Goal | Status | Current qualification |
| --- | --- | --- | --- |
| EPIC-001 Foundation & Static PWA | Responsive React/Vite/TypeScript PWA, local persistence, build metadata, and GitHub Pages workflow | partial | Static build, manifest, service worker, version-2 migration, and gated workflow exist. Live Pages, full PWA lifecycle, target-device cross-browser behavior, and interruption recovery from the deployed origin remain external acceptance checks (TASK-068). |
| EPIC-002 Documents, Templates & Expected Results | PDF upload/preview, two input modes, prompt/schema templates, Expected Results, and fingerprints | delivered | Editing and validation exist, including two bundled samples and a visual schema editor. Source records advance versions in place, while each new suite freezes the effective profile, prompt, schema and Golden content; legacy suites without snapshots are labelled unavailable. |
| EPIC-003 Provider Abstraction & BYOK | OpenAI, Gemini, and Custom OpenAI-compatible adapters with capability checks, usage, settings, pricing, and credential safety | partial | Adapters, connection diagnostics, ephemeral custom headers, recursive evidence redaction and frozen pricing association exist. Live-origin CORS/provider contracts remain external acceptance checks (TASK-068). |
| EPIC-004 Benchmark Runner | Single and 5/10/20/50/100-run execution with concurrency, bounded retry, Stop, budget, and persistence | delivered | Queueing, durable attempt intent, interruptible Stop, retry gating, synchronous concurrent reservations and fail-closed hard budgets are covered by production regressions. Provider contract bounds still require truthful user configuration. |
| EPIC-005 Evaluation & Stability Analytics | Schema, exact, leaf/row, strict/normalized, variant, heatmap, latency, and cost analysis | delivered | Deterministic strict and normalized metrics, policy persistence, variants, heatmap, latency, known/unknown cost summaries and malformed-attempt evidence are retained and exported separately. |
| EPIC-006 Results, Compare & Portability | Result inspection, comparison, JSON/CSV export, and project backup/restore | delivered | Live history queries expose all retained suites; inspectors use frozen snapshots; suite/export paths redact credentials; replace and merge validate complete entity graphs before writes. |
| EPIC-007 Security, QA & Release | Enforced secret boundaries, reliable gates, dependency review, accessibility, and production release evidence | open | Local lint/typecheck/unit/build/audit and active-wizard browser checks pass, with the known Windows WebKit offline limitation. Live provider/CORS, deployed Pages, target-device PWA and release sign-off remain open (TASK-068). |
| EPIC-008 Guided Workflow & Localization | Six-item task navigation, six-step wizard, bundled samples, provider reasoning controls, and localized UI | partial | The guided workflow is active; supported run presets, full retained history, fallback behavior and retired-demo cleanup are reconciled. English, Mandarin, Malay, Japanese and Vietnamese coverage remains incremental and target-device QA is external. |
| EPIC-009 Production-Readiness Remediation | Close review findings without adding a backend or weakening benchmark contracts | open | TASK-058..067 and TASK-070 have local implementation evidence; TASK-068 remains open for user-published Pages, live BYOK/provider/CORS and target-device PWA/browser acceptance. Production decision remains **NO-GO**. |
