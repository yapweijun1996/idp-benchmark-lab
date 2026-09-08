# TASK — IDP Benchmark Lab

Status values: `todo`, `in_progress`, `blocked`, `done`.

Current production decision: **NO-GO**. Local remediation and the versioned PWA/i18n work pass the local gates; the last published Pages checkpoint and remote CI evidence are recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md). Authorized live-provider/CORS evidence is still required. See the [remediation evidence](docs/reviews/2026-09-08-production-remediation.md).

## Historical spike delivery

TASK-000..056 retain their original delivery status. `done` here does not certify that the implementation still satisfies production acceptance; the review findings are tracked separately below.

| ID | Task | Status | Depends On |
|---|---|---|---|
| TASK-000 | Create documentation seed | done | — |
| TASK-001 | Initialize Git repository/project scaffold | done | TASK-000 |
| TASK-002 | React/Vite/TypeScript app shell | done | TASK-001 |
| TASK-003 | Responsive navigation/layout | done | TASK-002 |
| TASK-004 | PWA manifest/service worker | done | TASK-002 |
| TASK-005 | GitHub Pages Actions deployment | done | TASK-002 |
| TASK-006 | IndexedDB persistence | done | TASK-002 |
| TASK-007 | Document entity/PDF upload | done | TASK-006 |
| TASK-008 | PDF preview using PDF.js | done | TASK-007 |
| TASK-009 | Native PDF vs canonical render modes | done | TASK-008 |
| TASK-010 | Extraction profile editor | done | TASK-006 |
| TASK-011 | Modular prompt/contract editor | done | TASK-010 |
| TASK-012 | JSON schema editor + AJV validation | done | TASK-010 |
| TASK-013 | Golden Answer editor/versioning | done | TASK-012 |
| TASK-014 | Provider adapter interface | done | TASK-002 |
| TASK-015 | Gemini adapter | done | TASK-014 |
| TASK-016 | OpenAI adapter | done | TASK-014 |
| TASK-017 | Custom OpenAI-compatible adapter | done | TASK-014 |
| TASK-018 | BYOK key/session handling | done | TASK-014 |
| TASK-019 | Provider connection diagnostics | done | TASK-015/16/17 |
| TASK-020 | Pricing registry | done | TASK-014 |
| TASK-021 | Normalized usage/cost model | done | TASK-020 |
| TASK-022 | Single extraction run | done | TASK-013/15/16/17 |
| TASK-023 | Raw response + parsed JSON persistence | done | TASK-022 |
| TASK-024 | Deterministic JSON canonicalization | done | TASK-022 |
| TASK-025 | Schema-valid evaluation | done | TASK-024 |
| TASK-026 | Exact-match evaluation | done | TASK-024 |
| TASK-027 | Leaf-field accuracy | done | TASK-026 |
| TASK-028 | Ordered row accuracy | done | TASK-027 |
| TASK-029 | Conservative normalization | done | TASK-026 |
| TASK-030 | Strict vs normalized scoring | done | TASK-029 |
| TASK-031 | Benchmark queue | done | TASK-022 |
| TASK-032 | 5/10/20/50/100 presets | done | TASK-031 |
| TASK-033 | Stop behavior | done | TASK-031 |
| TASK-034 | Retry/backoff | done | TASK-031 |
| TASK-035 | Hard budget cap | done | TASK-021/031 |
| TASK-036 | Persist suite/run lifecycle | done | TASK-006/031 |
| TASK-037 | Output hashing/variants | done | TASK-024/036 |
| TASK-038 | Benchmark progress screen | done | TASK-036 |
| TASK-039 | Result summary dashboard | done | TASK-025-037 |
| TASK-040 | Field accuracy heatmap | done | TASK-027 |
| TASK-041 | JSON diff/run inspector | done | TASK-026 |
| TASK-042 | Latency statistics | done | TASK-036 |
| TASK-043 | Cost dashboard | done | TASK-021/036 |
| TASK-044 | Compare screen | done | TASK-039 |
| TASK-045 | JSON/CSV export | done | TASK-036 |
| TASK-046 | Project backup/import | done | TASK-006 |
| TASK-047 | Golden Popular PO fixture metadata | done | TASK-013 |
| TASK-048 | Unit tests for evaluation engine | done | TASK-024-030 |
| TASK-049 | Provider adapter contract tests | done | TASK-014 |
| TASK-050 | IndexedDB persistence tests | done | TASK-006 |
| TASK-051 | Stop/budget benchmark tests | done | TASK-031-035 |
| TASK-052 | Browser smoke tests | done | TASK-039 |
| TASK-053 | Accessibility checks | done | TASK-003 |
| TASK-054 | Security/cache audit | done | TASK-004/018 |
| TASK-055 | Docs/code reconciliation gate | done | TASK-052 |
| TASK-056 | Publish v0.1.0 spike release | done | TASK-005/048-055 |

## Production-readiness remediation

`todo` means work remains; it does not imply an unavailable resource. Production release is not accepted while the following gates remain open.

| ID | Task / review finding | Status | Depends On | Acceptance |
| --- | --- | --- | --- | --- |
| TASK-057 | Review production readiness at 26b0ae9 | done | TASK-056 | Dated report with source evidence, reproductions and verification limits |
| TASK-058 | Enforce credential persistence/export boundary (R3) | done | TASK-057 | Nested auth headers and credential echoes excluded from persistent config, evidence and exports; removing a provider or clearing local data also clears its memory/session key; active Privacy/Backup copy is verified against behavior |
| TASK-059 | Enforce hard budget before every attempt (R1) | done | TASK-057 | Zero/unknown/variable costs, in-flight reservations and concurrency cannot bypass the cap |
| TASK-060 | Stop retries during backoff (R2) | done | TASK-057 | Stop prevents every subsequent network attempt; already-started requests retain evidence |
| TASK-061 | Preserve immutable historical inputs/configuration (R4) | done | TASK-058 | Golden/profile edits and endpoint/settings changes cannot alter or mislabel old evidence; retain effective inputs and unique build identity; introduce a versioned IndexedDB migration before changing schema v1 |
| TASK-062 | Validate full backup before replace/merge (R5) | done | TASK-058 | Invalid entities/references rejected before mutation; original data remains intact; Backup UI claims match the implemented validation boundary |
| TASK-063 | Preserve failed response and attempt evidence (R6) | done | TASK-058 | Parse failures retain redacted raw output, usage/timing and correct failure classification |
| TASK-064 | Freeze suite pricing basis (R7) | done | TASK-061 | Preserve configured pricing associations in provider edits, expose an auditable configuration path, freeze the applied basis at suite start, and ensure price edits affect future suites only |
| TASK-065 | Persist/display strict and normalized metrics (R9) | done | TASK-061 | Both sets and policy survive reload/export; align exact/schema/error/latency/cost metric denominators and implemented outputs with EVALUATION.md |
| TASK-066 | Restore deterministic tests and release gates (R8) | done | TASK-057 | Fixed time fixtures and React teardown warnings; current-wizard E2E replaces obsolete Home demo coverage; PR and browser checks gate deployment |
| TASK-067 | Resolve dependency advisory paths (R10) | done | TASK-057 | Reviewed lockfile changes/reachability disposition; audit and build verified |
| TASK-068 | Complete production acceptance | blocked | TASK-058..067/070 | Real Pages-origin providers/CORS, browsers, PWA update/offline, large-document/stress, storage migration, and interruption checks recorded; explicit release decision |
| TASK-069 | Reconcile documentation with production review | done | TASK-057 | Status, current UI, known gaps, evidence and remediation ledger aligned; documentation-only validation completed |
| TASK-070 | Reconcile post-MVP UX and history behavior | done | TASK-066 | Home run-count guidance matches supported presets; Runs/Compare expose or explicitly paginate all retained history and use truthful copy; the canonical i18n registry covers literal UI calls in English, Mandarin, Malay, Japanese, and Vietnamese with explicit technical/data fallback; retired inline-demo source/tests/comments are removed or intentionally restored |

TASK-058..067 and TASK-070 have implementation and regression evidence in the remediation report. The Gateway Demo integration now uses the verified bounded image contract: origin-bound sessions, canonical pages in four-image batches, streamed Responses, model reduction for multiple batches, per-request Stop/budget gates, and redacted nested evidence. The current commit is published after the Actions/Pages gate, and a deployed-browser synthetic five-page run proved two map calls plus one reducer call. TASK-068 remains blocked until a real PDF map/reduce run, quota/usage/cost reconciliation, and any required target-device storage/cache evidence are recorded. No gateway or provider key was sent from the browser; the short-lived `dmo_` session is never persisted.
The first-run browser profile now also receives a keyless Gateway Demo provider configuration, which the wizard auto-selects when no other provider is configured. Session connection remains explicit, and an intentional removal is preserved.
