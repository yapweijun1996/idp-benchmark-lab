# ARCHITECTURE — IDP Benchmark Lab

## Summary

MVP is a **static SPA/PWA** hosted on GitHub Pages. There is no required application backend.

Production acceptance remains **NO-GO** for the external gates recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md). The local remediation keeps the static architecture and adapter boundary.

```text
Browser / PWA
 ├─ UI
 ├─ i18n (five selectable languages with fallback)
 ├─ PDF.js
 ├─ Extraction Profile
 ├─ JSON Schema / AJV
 ├─ Golden Answer
 ├─ Provider Adapters
 │   ├─ OpenAI
 │   ├─ Gemini
 │   └─ Custom OpenAI-compatible
 ├─ Benchmark Runner
 ├─ Evaluation Engine
 ├─ Cost Engine
 ├─ IndexedDB
 └─ Export/Import
        │
        └──── direct BYOK HTTPS calls ────> Provider API
```

## Implemented stack

- React
- TypeScript
- Vite
- `vite-plugin-pwa`
- PDF.js (`pdfjs-dist`)
- AJV for JSON Schema validation
- IndexedDB with Dexie
- native `fetch` in provider adapters
- Vitest
- Playwright

Versions are pinned by the lockfile. Dependency advisory remediation is tracked in TASK-067.

## Static-only boundary

Do not require Node server, database server, serverless function, proxy API, secret vault, or auth backend in MVP.

## Core modules

### documents
PDF selection, metadata, SHA-256 fingerprint, preview, canonical page rendering.

### profiles
Prompt, extraction contract, schema, version/hash.

### golden
Golden Answer versions, schema validation, golden hash.

### providers
Config, capabilities, request translation, response parsing, usage normalization.

### benchmarks
Suite identity, repeated queue, concurrency, retry, stop, budget, persistence.

### evaluation
Canonicalization, strict equality, normalized equality, leaf/row metrics, diff, variants.

### cost
Pricing snapshots, usage, calculated/unknown cost.

### storage
IndexedDB version 2 retains all eight stores. Its forward migration redacts legacy records, moves stored PDF Blobs to ArrayBuffer bytes and labels historical suites without snapshots as unavailable. Credentials/custom headers remain outside IndexedDB; deleting providers or clearing data clears ephemeral credentials.

### export
Suite JSON/CSV and full backups apply recursive credential redaction. Import validates complete records, hashes and relationships before writes; merge also validates the resulting graph inside the write transaction.

### pwa
Manifest/service-worker policy constants; app-shell-only precache whitelist audited by tests.

### i18n
English, Mandarin, Malay, Japanese, and Vietnamese selection with the preference in `AppSettings`. `COPY` plus incremental `EXTRA_COPY` entries fall back to English or the original key; coverage/fallback behavior is tested locally, while target-device QA remains part of TASK-068.

### history query boundary
All retained suites are exposed by a live IndexedDB query; there is no hidden latest-20 cutoff. Inspectors subscribe to changes and use frozen Golden snapshots.

## Benchmark identity

A started benchmark must retain immutable effective inputs and identity: document, profile/prompt/schema/Golden, provider endpoint/settings/model, thinking/reasoning, temperature, input mode, renderer settings, run count, concurrency, and unique app build.

Suite snapshots retain the effective values and actual PDF/image bytes. Their digest joins identity hashes; the app build includes Git revision and a unique UUID. Historical inspectors use snapshot Golden content, and legacy missing snapshots are labelled unavailable.

Do not label results as repeatability evidence if any identity input changes.

## Run state machine

```text
queued -> running -> succeeded | provider_error | parse_error | schema_invalid | cancelled
```

Suite:

```text
draft -> running -> completed | stopped | budget_stopped | failed
```

## Scheduling

Default concurrency = 1. The required gate is before every network attempt, including retries: check Stop, budget/reservations, requested count and rate-limit state.

Stop and synchronous cost reservation run immediately before every adapter attempt, after asynchronous input preparation and durable intent recording. A missing safe contract bound blocks hard-cap execution. Graceful Stop allows existing requests to finish and retain evidence, while waking backoff and preventing further calls. Unknown billing retains the full reservation.

Malformed output retains a redacted transport envelope and usage as parse_error. Every attempt retains timing/cost/error evidence; suite pricing is fixed at creation. Strict and normalized metrics persist separately. Browser execution locks coordinate tabs; abandoned suites recover as interrupted without automatic network replay.

## PDF modes

- **Native:** original PDF to a provider whose implemented adapter supports that path (currently Gemini).
- **Canonical images:** PDF.js renders fixed page images; all providers receive the same visual form.

Mode is part of benchmark identity.

## Service worker

Cache app shell/static assets only. Do not cache API keys, provider traffic, PDFs, generated page images, or benchmark results.
