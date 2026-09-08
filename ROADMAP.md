# ROADMAP — IDP Benchmark Lab

## Current priority — Production-readiness remediation

Status: OPEN; production decision **NO-GO** following the 2026-09-08 review of `26b0ae9`.

[TASK.md](TASK.md) owns task status and acceptance; [PROJECT_STATUS.md](PROJECT_STATUS.md) owns the dated verification baseline. The [review](docs/reviews/2026-09-08-production-readiness.md) provides evidence. Historical phase delivery below is not a current release certificate.

Execution order:

1. Protect credentials and enforce budget/Stop before every network attempt (TASK-058..060).
2. Freeze historical inputs and pricing, validate backups, preserve failed evidence, and expose normalized metrics (TASK-061..065).
3. Restore deterministic unit/current-wizard E2E gates, resolve dependency advisories, and reconcile post-MVP UX/history behavior (TASK-066/067/070).
4. Complete authorized real-origin provider, browser, PWA, storage-migration, stress and interruption acceptance (TASK-068).

Exit: all remediation/verification gates have recorded evidence and the production release decision is explicitly reassessed. Documentation reconciliation is TASK-069; it does not close implementation findings.

## Historical delivery phases

| Phase | Delivered scope | Current qualification |
| --- | --- | --- |
| 0 — Documentation seed | Product scope, contracts and planning documents | Reconciled with current code/review; requirements retained |
| 1 — PWA foundation | React/Vite/TypeScript shell, IndexedDB, manifest/service worker, Pages workflow | Local build verified; live Pages/PWA lifecycle acceptance outstanding |
| 2 — Single extraction | Local PDF preview, profiles/schema/Golden, adapters and single-run inspector | Failed-response evidence and historical-version guarantees are remediated locally; live provider acceptance remains open |
| 3 — Benchmark harness | Repeated queue, concurrency, retry, Stop, cost/budget and run records | Per-attempt Stop/budget controls are covered locally; live-origin acceptance remains open |
| 4 — Evaluation | Exact/schema/field/row metrics, variants, heatmap, latency/cost | Strict and normalized results are persisted, displayed and exported separately |
| 5 — Compare and portability | Comparison, JSON/CSV export, backup/import | Credential redaction, whole-backup validation and immutable inputs are remediated locally |
| 6 — Spike hardening/release | v0.1.0 delivery recorded in the historical task ledger | Local unit/build/audit gates pass; the known Windows WebKit limitation and external release gates remain |
| 7 — Guided UI | Six-item task navigation, six-step wizard, terminology and settings | Current primary workflow is covered by active-wizard browser checks |
| 8 — Bundled samples | Bundled fixtures, runtime PDF renderer wiring and wizard entry points | Samples remain available through the wizard; the retired inline Home card and obsolete tests were removed |

## Post-Phase 8 implementation changes

The current code also includes changes that were not reflected in the original phase plan:

- a guided Home → New Benchmark experience with inline prompt and visual/advanced schema overrides;
- two auto-seeded bundled document/template/Expected Result sets, without an auto-created provider or offline gateway;
- English, Mandarin, Malay, Japanese, and Vietnamese selection with partial-translation fallback;
- editable provider model suggestions, Custom `chat_completions`/`responses` style, OpenAI reasoning effort, and Gemini thinking level;
- accuracy details in the wizard result view;
- corrected Gemini `thinkingConfig.thinkingLevel` request mapping.

These are delivered spike capabilities, not production acceptance. TASK-070 is complete locally; TASK-068 owns the remaining published-origin, provider/CORS, target-browser and PWA acceptance.

## Current user journey

Home offers Start benchmark and routes into New Benchmark. The six steps are Document → What to Extract → Expected Result → Choose AI → Run Settings → Review & Run. Users can select a bundled sample or upload a PDF, choose a configured provider, and run a Quick Test or repeated Benchmark. Provider configuration/runtime key entry is available in Settings → AI Providers. Execution records persist locally, and Home/Runs/Compare expose all retained suites through live queries.

The active wizard and retained-history behavior are covered by the current smoke and browser checks. See [DESIGN.md](DESIGN.md) for the current UI and [TESTING.md](TESTING.md) for verification gaps.

## Deferred

Backend/server mode, multi-user collaboration, ERP posting, automatic prompt optimization, agentic correction loops, RAG, batch APIs and remote workers remain outside the current remediation scope. Do not add them to solve these local correctness and acceptance gaps.
