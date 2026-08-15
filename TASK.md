# TASK — IDP Benchmark Lab

Status values: `todo`, `in_progress`, `blocked`, `done`.

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
| TASK-040 | Field accuracy heatmap | todo | TASK-027 |
| TASK-041 | JSON diff/run inspector | todo | TASK-026 |
| TASK-042 | Latency statistics | todo | TASK-036 |
| TASK-043 | Cost dashboard | todo | TASK-021/036 |
| TASK-044 | Compare screen | todo | TASK-039 |
| TASK-045 | JSON/CSV export | todo | TASK-036 |
| TASK-046 | Project backup/import | todo | TASK-006 |
| TASK-047 | Golden Popular PO fixture metadata | todo | TASK-013 |
| TASK-048 | Unit tests for evaluation engine | todo | TASK-024-030 |
| TASK-049 | Provider adapter contract tests | todo | TASK-014 |
| TASK-050 | IndexedDB persistence tests | todo | TASK-006 |
| TASK-051 | Stop/budget benchmark tests | todo | TASK-031-035 |
| TASK-052 | Browser smoke tests | todo | TASK-039 |
| TASK-053 | Accessibility checks | todo | TASK-003 |
| TASK-054 | Security/cache audit | todo | TASK-004/018 |
| TASK-055 | Docs/code reconciliation gate | todo | TASK-052 |
| TASK-056 | Publish v0.1.0 spike release | todo | TASK-005/048-055 |

## Current blockers

No implementation blocker exists because implementation has not started.

Expected risks: provider browser CORS, browser-visible BYOK keys, provider PDF/structured-output differences, pricing/API drift, large PDF memory use, Safari IndexedDB/service-worker edge cases, GitHub Pages base-path routing.
