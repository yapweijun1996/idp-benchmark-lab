# IDP Benchmark Lab

A static, BYOK (Bring Your Own Key) PWA demo/spike for benchmarking Intelligent Document Processing (IDP) extraction across OpenAI, Gemini, and custom LLM providers.

## Project status

**Status:** package version 0.1.0; production **NO-GO** until TASK-068 external acceptance completes. Local remediation implements credential redaction, per-attempt Stop/budget gates, frozen evidence, validated backups, separate scoring, CI gates, a versioned PWA update prompt, and complete UI translation coverage. See the [remediation evidence](docs/reviews/2026-09-08-production-remediation.md).

**Reviewed code:** current working tree; the last published checkpoint is recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md).

**Date:** 2026-09-08

**Repository:** `idp-benchmark-lab`

**Try it:** Home → **Start benchmark** → the **New Benchmark** wizard. Select one of two auto-seeded bundled samples or upload a PDF, review or override the extraction fields/schema and Expected Result, choose a configured AI provider, then use Quick Test or a 5/10/20/50/100-run Benchmark. Provider configuration and runtime API-key entry are available in Settings → AI Providers. The old inline Home demo card is not the active entry point.

Use non-sensitive samples and restricted BYOK credentials for live acceptance. Hard-cap execution requires a verified provider-contract maximum per attempt; missing bounds stop before any request. Starting a benchmark retains its PDF bytes and, in image mode, rendered images in local evidence and backups.

See [current status and verification](PROJECT_STATUS.md), [tasks](TASK.md), and the [original review](docs/reviews/2026-09-08-production-readiness.md). The PWA/i18n code is on GitHub; wait for the Actions and Pages rerun before relying on new remote evidence. No provider credentials are required for CI.

The current shell offers English, Mandarin, Malay, Japanese, and Vietnamese. A canonical registry checks every literal UI translation call and requires an explicit value for each supported locale; provider/model names, file names, and other data-derived technical values retain their documented English fallback. The About panel shows the friendly package version (for example, `v0.1.0`) and exposes the full build identity in technical details. When a service-worker refresh is available, the update prompt shows the currently loaded version and waits for explicit user acceptance.

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
