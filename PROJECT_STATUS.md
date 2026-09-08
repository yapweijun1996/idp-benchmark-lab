# PROJECT STATUS — IDP Benchmark Lab

## Current decision

**NO-GO for production.** The static package-version 0.1.0 demo/spike exists; the reviewed checkout has no local release tag, and production acceptance is incomplete. This status is based on the 2026-09-08 local review of `26b0ae9`, not a check of the currently deployed Pages site. Updating documentation does not fix the reviewed defects.

The current entry point is Home → New Benchmark. The six-step wizard offers bundled samples or a local PDF, extraction fields/schema, Expected Result, AI provider, run settings, and review/execution. The former inline Home demo card remains in source but is not mounted by the active Home page.

Delivered post-MVP behavior includes two bundled sample sets, a visual schema editor, editable provider model IDs, OpenAI reasoning effort, Gemini thinking level, and a five-language selector (`en/zh/ms/ja/vi`). Localization is partial and falls back to English/source keys. Runs & Results and Compare currently load only the newest 20 suites, and Home's "3 repeated runs" guidance conflicts with the supported 5/10/20/50/100 presets. These are tracked in TASK-070.

## Verified baseline

| Check | Result on 2026-09-08 |
| --- | --- |
| Lint | PASS with 2 Fast Refresh warnings in `src/i18n.tsx` |
| Typecheck | PASS |
| Production build | PASS; PWA generated with 17 precache entries; main JS 1.08 MB (327 KB gzip) and over-500-KB chunk warning |
| Existing unit/integration suite | 293 passed, 1 failed across 52 files; 9 unhandled post-teardown React errors |
| Existing Chromium browser suite | 5 passed, 3 failed |
| Isolated review probes | 10 defects/scenarios reproduced; not fixes |
| Dependency audit | Four high-severity affected dependency entries, including parent chains; application exploitability not established |

The pricing test fails because it compares today's timestamp with a fixed 2026-08-20 date. The nine unhandled errors are late state updates after the `App.a11y` test environment is torn down; passing assertions may therefore be false positives. Browser failures target the removed Home demo controls and occur before testing extraction. Port 4173 was unavailable on the review machine; the same browser cases ran against the built app on temporary port 52173. No application code or lockfile changed during review.

## Work required before release

| Area | Current gap | Task |
| --- | --- | --- |
| Credentials | Custom auth headers and response/error echoes can persist and enter exports | TASK-058 |
| Budget | First/unknown-cost requests and concurrency can exceed the cap | TASK-059 |
| Stop | Retries can start after Stop during backoff | TASK-060 |
| Historical evidence | Mutable Golden/profile references and incomplete input/configuration snapshots | TASK-061 |
| Backup import | ID-only malformed records can replace valid data | TASK-062 |
| Failed responses | Malformed output loses raw evidence/usage and is classified as provider_error | TASK-063 |
| Pricing | Prices are resolved per response instead of frozen with a suite | TASK-064 |
| Normalized metrics | Calculated by the evaluator but not persisted/displayed with strict results | TASK-065 |
| Release gates | Date-sensitive unit test, obsolete browser flow, missing E2E/PR workflow gates | TASK-066 |
| Dependencies | Review and resolve current affected dependency paths | TASK-067 |
| UX/history consistency | Partial localization, 3-vs-5 run guidance, latest-20 truncation, and retired demo source/tests | TASK-070 |
| Production acceptance | Real-origin provider, browser, PWA and interruption evidence outstanding | TASK-068 |

Detailed reproduction evidence, source locations, and bounded corrections are in the [review](docs/reviews/2026-09-08-production-readiness.md). [TASK.md](TASK.md) owns remediation status; [TESTING.md](TESTING.md) owns validation procedures; [docs/DEPENDENCIES.md](docs/DEPENDENCIES.md) owns the dated dependency/toolchain snapshot.

## Evidence limits

Live paid provider calls, CORS from the Pages origin, deployed revision/Actions status, Firefox/Safari, large-document stress, interruption recovery, and the complete PWA offline/update lifecycle were not verified. Mocked adapter tests and a successful build do not establish these outcomes.

KB-MCP was consulted. Retrieved material primarily concerned other IDP/KB projects and did not establish acceptance for this repository; the review relies on local code and observable tests.

## Next action

Repair credential boundaries and per-attempt budget/Stop enforcement first, then immutable evidence and import validation. Restore deterministic tests, reconcile the active workflow/history behavior, and complete production acceptance before changing the NO-GO decision. Preserve the static/BYOK architecture; a backend or full rewrite is not required.
