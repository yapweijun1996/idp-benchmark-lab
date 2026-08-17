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

## Phase 7 — UI/UX Redesign (post-v0.1.0)

Status: IMPLEMENTATION AND QA COMPLETE — closure pending review

The v0.1.0 entity-first sidebar (Dashboard/Documents/Extraction Profiles/Golden Answers/
Providers/Benchmarks/Compare/Settings) asked users to already know the workflow before finding
the right screen. Phase 7 replaces it with a task-oriented IA and a guided benchmark wizard; see
DESIGN.md for the current navigation and screens.

Deliver:
- 6-item task-oriented nav (Home/New Benchmark/Runs & Results/Compare/Library/Settings) with
  legacy-route redirects for old bookmarks
- guided 6-step benchmark wizard (Document → What to Extract → Expected Result → Choose AI →
  Run Settings → Review & Run) replacing the flat Benchmark Builder form
- Home/Compare/Library empty-state and onboarding rewrite (what/why/next + CTA)
- Settings hub restructure (AI Providers/General/Storage/Backup & Restore/Privacy & Security/About)
- user-facing terminology sweep (Golden Answer → Expected Result, Extraction Profile →
  Extraction Template, Suite → Benchmark in UI copy, IndexedDB/sessionStorage jargon → plain
  language) — internal type/table names deliberately left unchanged
- persisted `defaultRunCount` setting (Settings → General), read by the wizard's benchmark step
- inline feedback states across upload/save/validate/connect/run/stop/import/export flows
- mobile/tablet responsive pass, accessibility QA, documentation reconciliation

Exit: a first-time user can go from Home to a completed benchmark without prior knowledge of the
app's entity model, and existing evidence/export/BYOK guarantees are unchanged.

Deliberately out of scope for this phase (not oversights): inline in-wizard resource creation
(create a template/expected result without leaving the wizard) — the wizard still links out to
Library; and a unified provider "Connect & Test" button — `ProvidersPage` keeps Save config and
Test connection as two explicit actions, since collapsing them changes an existing, tested
interaction contract for a phase scoped to navigation/wording/feedback, not new workflows.

## Deferred

Backend/server mode, multi-user collaboration, ERP posting, automatic prompt optimization, agentic correction loops, RAG, batch APIs, remote workers.
Also deferred until this UI/UX phase closes (per explicit sequencing): Agentic Workflow, ERP integration.
