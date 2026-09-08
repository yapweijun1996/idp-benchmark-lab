# ARCHITECTURE — IDP Benchmark Lab

## Summary

MVP is a **static SPA/PWA** hosted on GitHub Pages. There is no required application backend.

Production acceptance is **NO-GO** as of the [2026-09-08 review](docs/reviews/2026-09-08-production-readiness.md). Module boundaries below describe the implemented structure; guarantees identified as requirements are not all enforced yet.

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
IndexedDB version 1 and backup/export. Eight stores exist, but no later upgrade handler exists yet; schema remediation requires a tested forward migration. The dedicated key store is separate, but secret custom headers currently bypass that separation and provider/data deletion does not clear every ephemeral key (TASK-058/061).

### export
Suite JSON/CSV export and full project backup/import. Current import validation checks the envelope, string IDs and top-level secret-like fields only; full entity validation and recursive secret handling remain open (TASK-058/062).

### pwa
Manifest/service-worker policy constants; app-shell-only precache whitelist audited by tests.

### i18n
English, Mandarin, Malay, Japanese, and Vietnamese selection with the preference in `AppSettings`. `COPY` plus incremental `EXTRA_COPY` entries fall back to English or the original key, so localization is not a fully closed boundary yet (TASK-070).

### history query boundary
Suites/runs are persisted in IndexedDB, but `useRunHistory` returns only the latest 20 suites to Home, Runs & Results, and Compare. Full-history pagination/disclosure remains TASK-070.

## Benchmark identity

A started benchmark must retain immutable effective inputs and identity: document, profile/prompt/schema/Golden, provider endpoint/settings/model, thinking/reasoning, temperature, input mode, renderer settings, run count, concurrency, and unique app build.

Currently suites hold hashes and IDs, while profile/Golden updates overwrite the referenced records. Custom endpoint/API settings and full override values are not frozen with the suite, and app build uses package version only. TASK-061 owns this gap; the existing identity is insufficient for immutable historical evidence.

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

Currently Stop/budget checks run in the outer worker loop; retry attempts bypass them. Budget uses the last observed run cost without concurrent reservations and continues when cost is unknown. TASK-059/060 must correct this. An already-started request is intended to finish normally and retain its terminal evidence; aborting in-flight requests is not the current graceful Stop contract.

The type model includes `parse_error`, but adapters currently throw malformed output as a provider error and discard its response/usage before persistence (TASK-063). Pricing is reread per extraction rather than frozen at suite start (TASK-064). Strict and normalized metrics are computed, but only strict metrics are persisted/displayed (TASK-065).

## PDF modes

- **Native:** original PDF to a provider whose implemented adapter supports that path (currently Gemini).
- **Canonical images:** PDF.js renders fixed page images; all providers receive the same visual form.

Mode is part of benchmark identity.

## Service worker

Cache app shell/static assets only. Do not cache API keys, provider traffic, PDFs, generated page images, or benchmark results.
