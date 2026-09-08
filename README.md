# IDP Benchmark Lab

A static, BYOK (Bring Your Own Key) PWA demo/spike for benchmarking Intelligent Document Processing (IDP) extraction across OpenAI, Gemini, and custom LLM providers.

## Project status

**Status:** package version 0.1.0 demo/spike; **not ready for production (NO-GO)**. The reviewed checkout has no local release tag. The 2026-09-08 review found defects in budget/Stop enforcement, credential persistence/export, historical evidence, and backup validation, plus failing release tests. Previous phase/task completion records describe delivery history, not current production acceptance.

**Reviewed code:** `26b0ae9`

**Date:** 2026-09-08

**Repository:** `idp-benchmark-lab`

**Try it:** Home → **Start benchmark** → the **New Benchmark** wizard. Select one of two auto-seeded bundled samples or upload a PDF, review or override the extraction fields/schema and Expected Result, choose a configured AI provider, then use Quick Test or a 5/10/20/50/100-run Benchmark. Provider configuration and runtime API-key entry are available in Settings → AI Providers. The old inline Home demo card is not the active entry point.

Use non-sensitive samples and restricted test credentials during evaluation. Do not rely on the current hard-budget control, secret-free backups, or immutable historical evidence. Requirements below remain the target; they are not a claim that every acceptance criterion passes.

See [current status and verification](PROJECT_STATUS.md), [remediation tasks](TASK.md), and the [production-readiness review](docs/reviews/2026-09-08-production-readiness.md). Live provider/CORS and deployed Pages acceptance remain unverified by this review.

The current shell offers English, Mandarin, Malay, Japanese, and Vietnamese. Translation coverage is incremental and falls back to English or the source key when a page string is missing; it is not yet a fully verified localization release.

## Core question

> Given the same PDF, extraction prompt, JSON schema, model settings, and Golden Answer, how accurate, stable, fast, and expensive is a provider/model over repeated runs?

## MVP

The PWA must allow an end user to:

1. Upload a PDF locally.
2. Preview the document.
3. Define a modular extraction profile: prompt + requested fields + JSON schema.
4. Define the expected correct JSON (Golden Answer).
5. Configure a BYOK provider: OpenAI, Gemini, or Custom OpenAI-compatible provider.
6. Run a single extraction.
7. Run repeated stability tests: 5, 10, 20, 50, or 100 runs.
8. Inspect every raw and parsed output.
9. Compare each output to the Golden Answer.
10. See exact pass rate, field accuracy, row accuracy, schema-valid rate, consistency/stability, unique variants, latency, usage, and cost.
11. Stop a benchmark manually.
12. Enforce a hard budget cap.
13. Export benchmark data as JSON/CSV.
14. Run as a static GitHub Pages PWA with no required application backend.

## Non-goals for the spike

- ERP posting
- RAG
- autonomous agents
- production document workflow
- multi-user server accounts
- server-side secret storage
- billing
- production SLA
- automatic prompt optimization

## Source-of-truth order

After implementation starts:

1. Executable tests and schemas
2. Current repository code
3. Architecture/decision documents
4. Task/roadmap documents
5. README summaries

If documentation conflicts with code, inspect the code and tests, determine intended behavior, then update the docs in the same change.

## Documentation map

- `DESIGN.md` — UI/UX and product design
- `SPEC.md` — functional/non-functional requirements
- `EPIC.md` — product epics
- `ROADMAP.md` — phased delivery plan
- `TASK.md` — implementation task ledger
- `ARCHITECTURE.md` — technical architecture
- `DATA_MODEL.md` — local data entities
- `PROVIDERS.md` — provider abstraction and capabilities
- `EVALUATION.md` — accuracy/stability metrics
- `SECURITY.md` — BYOK and browser security
- `TESTING.md` — test strategy
- `PWA.md` — offline/static PWA behavior
- `DEPLOYMENT.md` — GitHub Pages deployment
- `docs/DEPENDENCIES.md` — resolved toolchain, advisory status, and update policy
- `DECISIONS.md` — architecture decisions
- `CHANGELOG.md` — release notes
- `MANIFEST.md` — documentation file inventory
- `PROJECT_STATUS.md` — status, blockers, next steps
- `AGENTS.md` — implementation rules for coding agents
- `IMPLEMENTATION_PROMPT.md` — ready-to-use coding-agent prompt
- `docs/` — detailed contracts, metrics, security, samples, deployment notes, and dated reviews
