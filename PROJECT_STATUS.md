# PROJECT STATUS — IDP Benchmark Lab

## Current status

**v0.1.0 released (all 56 tasks complete). Phase 7 (task-oriented IA, guided wizard, terminology)
and Phase 8 (demo-first Home) complete — see ROADMAP.md.**  
Phase 6 hardening delivered: evaluation/adapter/storage/stop-budget test coverage verified, Playwright browser smoke (4 specs against the production build), axe-core accessibility gate, security audit tests (app-shell-only SW whitelist, key non-persistence, backup secret rejection), and docs/code reconciliation (README status, ARCHITECTURE modules, TESTING additions).

Phase 7 replaced the v0.1.0 entity-first sidebar with a task-oriented IA (Home/New Benchmark/
Runs & Results/Compare/Library/Settings), a guided 6-step benchmark wizard, a user-facing
terminology sweep, a persisted default run-count setting, and inline feedback states across
upload/save/validate/connect/run/stop/import/export flows — see ROADMAP.md Phase 7 and
DESIGN.md for details.

Phase 8 replaced the first-time Home experience with a bundled, ready-to-run demo (sample PDF +
prompt + schema + expected result already loaded) so a new visitor can see a real accuracy/
stability result within one click, with custom-document benchmarking demoted to a secondary
"Upload my document" link. Along the way, fixed a real pre-existing gap: canonical_images mode
(needed by OpenAI/OpenAI-compatible, which don't accept native PDF) had no PDF renderer wired
anywhere in production — see ROADMAP.md Phase 8.

Lint/typecheck/build green; 270 unit/integration tests passing; 7/7 e2e specs passing
(production build, real Chromium).  
Date: 2026-08-17

## Completed discovery

- project purpose and repo name defined
- static PWA + GitHub Pages requirement confirmed
- BYOK confirmed
- providers: OpenAI, Gemini, Custom OpenAI-compatible
- PDF upload/extract workflow defined
- modular prompt/schema requirement defined
- Golden Answer defined
- run presets 5/10/20/50/100 defined
- accuracy vs stability separated
- cost/usage tracking required
- field-level drift/variant analysis required
- hard budget cap + Stop required
- direct structured JSON root preferred
- strict source-field isolation identified

## Experimental findings motivating project

On the Golden Popular PO:
- Vendor Article No. moved into `remark` in some runs
- after prompt changes, it moved into `stock_desc` in another run
- `M650 M WL WHITE` sometimes became `M650 MWL WHITE`
- changing thinking level changes benchmark identity
- structured-output schema changed response shape

A single good extraction is not enough evidence.

## Completed work

- documentation seed (TASK-000)
- repository scaffold, Vite/React/TS strict toolchain (TASK-001)
- responsive app shell with hash routing and unit tests (TASK-002, TASK-003)
- PWA manifest, app-shell-only service worker, icon set, explicit update prompt (TASK-004)
- GitHub Pages Actions deployment workflow with CI gates (TASK-005)
- IndexedDB/Dexie schema v1: 8 stores, forward-only migration, unique [suiteId+runNumber] (TASK-006)

## Pending work

All v0.1.0 tasks in `TASK.md` are done. Phase 7 and Phase 8 are both complete — see ROADMAP.md.
Noted as deliberate scope decisions rather than open work: inline in-wizard resource creation
(B.2, skipped by design), a unified provider Connect+Test button on `ProvidersPage` (kept as two
separate actions), and demo-run persistence into Library/Runs & Results (kept as-is — the demo
reuses the exact same `BenchmarkRunner`, so its runs are real, inspectable history, not a
sandboxed/throwaway mode).

Post-release follow-ups: push to GitHub and enable Pages, real-provider Golden PO validation run
(now easy to try via the Home demo card against a real key), interrupted-suite resume, Agentic
Workflow, ERP integration.

## Risks

1. Provider browser CORS.
2. BYOK key visible in browser runtime.
3. Provider API/pricing drift.
4. Native PDF behavior differs by provider.
5. Rate limits and 100-run cost.
6. Browser memory for PDF rendering.
7. GitHub Pages/PWA base-path issues.

## Immediate next steps

1. Create GitHub repository.
2. Copy this documentation into root.
3. Give `IMPLEMENTATION_PROMPT.md` to coding agent.
4. Scaffold/deploy PWA shell.
5. Implement IndexedDB/PDF preview.
6. Implement Golden single-run path.
7. Add repeated benchmark harness.
8. Add metrics/cost dashboard.
9. Reconcile docs with real code before release.
