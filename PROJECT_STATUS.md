# PROJECT STATUS — IDP Benchmark Lab

## Current status

**Phase 2 (Golden Single-Run Extraction) complete.**  
End-to-end single run works: pick document/profile/provider/golden, choose input mode (native PDF or canonical images), run, and inspect persisted raw/parsed/schema/cost/latency evidence; every run records an immutable benchmark identity (document/profile/prompt/schema/golden/provider/model/settings/mode/renderer/app build). Phase 3 (repeated benchmark harness) is next. 140 tests passing; lint/typecheck/build green.  
Date: 2026-08-15

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

Everything in `TASK.md` except TASK-000..TASK-023. Next: TASK-024 (deterministic canonicalization — core module already exists), then Phase 3: TASK-031..TASK-038 (benchmark queue, presets, stop, retry, budget, persistence, progress).

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
