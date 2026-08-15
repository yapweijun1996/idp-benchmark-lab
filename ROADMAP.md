# ROADMAP — IDP Benchmark Lab

## Phase 0 — Documentation Seed
Status: COMPLETE

## Phase 1 — PWA Foundation
Status: NEXT

Deliver:
- repository scaffold
- Vite + React + TypeScript
- responsive shell
- IndexedDB
- manifest/service worker
- GitHub Pages deployment

Exit: static app auto-deploys; no provider integration required yet.

## Phase 2 — Golden Single-Run Extraction

Deliver:
- PDF upload/preview
- extraction profile
- JSON schema editor
- Golden Answer editor
- Gemini/OpenAI/Custom adapters
- single-run inspector

Exit: one document can be extracted and compared to Golden JSON.

## Phase 3 — Benchmark Harness

Deliver:
- repeated runner
- queue/concurrency
- retry/backoff
- stop
- budget cap
- persisted run evidence
- usage/cost

Exit: repeated test completes safely and persists all evidence.

## Phase 4 — Evaluation Dashboard

Deliver:
- exact/schema/field/row metrics
- strict vs normalized
- variants/hashes
- field heatmap
- latency/cost
- run diff inspector

Exit: benchmark clearly identifies accuracy and stability problems.

## Phase 5 — Compare & Portability

Deliver:
- provider/model/settings comparison
- input mode comparison
- prompt/schema version comparison
- export/import
- reusable Golden Sets

## Phase 6 — Spike Hardening

Deliver:
- accessibility
- cross-browser QA
- 100-run stress test
- recovery tests
- security audit
- docs/code reconciliation
- v0.1.0 release

## Deferred

Backend/server mode, multi-user collaboration, ERP posting, automatic prompt optimization, agentic correction loops, RAG, batch APIs, remote workers.
