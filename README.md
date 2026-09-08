# IDP Benchmark Lab

A static, BYOK (Bring Your Own Key) PWA demo/spike for benchmarking Intelligent Document Processing (IDP) extraction across OpenAI, Gemini, and custom LLM providers.

## Project status

**Status:** package version 0.1.0; production **NO-GO** until TASK-068 external acceptance completes. Local remediation implements credential redaction, per-request Stop/budget gates, frozen evidence, validated backups, separate scoring, CI gates, a versioned PWA update prompt, complete UI translation coverage, and the bounded Gateway Demo browser profile. See the [remediation evidence](docs/reviews/2026-09-08-production-remediation.md).

**Reviewed code:** current working tree; the last published checkpoint is recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md).

**Date:** 2026-09-08

**Repository:** `idp-benchmark-lab`

**Try it:** Home → **Start benchmark** → the **New Benchmark** wizard. Select one of two auto-seeded bundled samples or upload a PDF, review or override the extraction fields/schema and Expected Result, choose a configured AI provider, then use Quick Test or a 5/10/20/50/100-run Benchmark. Provider configuration and runtime API-key entry are available in Settings → AI Providers. The old inline Home demo card is not the active entry point.

Use non-sensitive samples and restricted BYOK credentials for live acceptance. Hard-cap execution requires a verified provider-contract maximum per attempt; missing bounds stop before any request. Starting a benchmark retains its PDF bytes and, in image mode, rendered images in local evidence and backups.

### Gateway Demo

Settings → AI Providers includes a `Gateway Demo` preset for the registered Pages
origin. Connect first to obtain a 15-minute origin-bound session; the `dmo_…` token
is memory-only and is never saved in provider config, IndexedDB, backups, exports,
logs, or service-worker cache. The preset forces canonical page images and the
Responses API. It sends at most four images per request (4 MiB per image, 8 MiB total
images, 12 MiB body) and uses sequential map calls plus a model reducer for larger
PDFs. Gateway quota, rate/session limits, and the 800-output-token ceiling remain in
force. A failed child call after a successful batch is retained as partial evidence
and is not automatically replayed.
New browser profiles receive a persisted, keyless `Gateway Demo` configuration on
first load, so it is already selectable in the New Benchmark wizard. The user must
still connect a short-lived demo session explicitly before making a provider call;
removing the preset is respected and it is not recreated on later mounts.
The gateway may route the `demo-fast` alias across healthy providers server-side; the
browser records the public alias and each request's usage/evidence rather than claiming a
fixed upstream provider.
If the gateway enables Turnstile for a deployment, the static preset needs a browser
challenge integration before that project can connect; no Turnstile or provider secret is
bundled or persisted by this app.

See [current status and verification](PROJECT_STATUS.md), [tasks](TASK.md), and the [original review](docs/reviews/2026-09-08-production-readiness.md). The current Gateway Demo integration is published after the required Actions and Pages gate; full real-document and billing acceptance remains open. No provider credentials are required for CI.

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
