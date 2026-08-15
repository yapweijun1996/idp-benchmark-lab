# IDP Benchmark Lab

A static, BYOK (Bring Your Own Key) PWA demo/spike for benchmarking Intelligent Document Processing (IDP) extraction across OpenAI, Gemini, and custom LLM providers.

## Project status

**Status:** Documentation seed / implementation not started  
**Date:** 2026-08-15  
**Recommended repository name:** `idp-benchmark-lab`

There is no existing application code yet. These documents define the agreed target behavior and implementation plan. Once implementation begins, the repository code, tests, versioned schemas, and provider adapters become the implementation source of truth. Documentation must be updated whenever code behavior changes.

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
- `DECISIONS.md` — architecture decisions
- `PROJECT_STATUS.md` — status, blockers, next steps
- `AGENTS.md` — implementation rules for coding agents
- `IMPLEMENTATION_PROMPT.md` — ready-to-use coding-agent prompt
- `docs/` — detailed contracts, metrics, security, Golden sample, deployment notes
