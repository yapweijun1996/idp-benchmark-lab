# ARCHITECTURE — IDP Benchmark Lab

## Summary

MVP is a **static SPA/PWA** hosted on GitHub Pages. There is no required application backend.

```text
Browser / PWA
 ├─ UI
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

## Recommended stack

- React
- TypeScript
- Vite
- `vite-plugin-pwa`
- PDF.js (`pdfjs-dist`)
- AJV for JSON Schema validation
- IndexedDB; Dexie recommended as wrapper
- native `fetch` for provider adapters unless a browser-safe SDK materially simplifies implementation
- Vitest
- Playwright

Use current stable versions when implementation begins.

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
IndexedDB migrations and backup/export; no key persistence by default.

## Benchmark identity

A started benchmark is immutable and must include document hash, profile/prompt/schema/golden hashes, provider/model, thinking/reasoning, temperature, input mode, renderer settings, run count, concurrency, and app build.

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

Default concurrency = 1. Before every request, check stop flag, budget cap, requested count, and rate-limit state.

Stop prevents new starts. In MVP an in-flight request finishes normally and its run records a terminal state; aborting in-flight requests is a documented future option, not a silent behavior.

## PDF modes

**Native:** original PDF to provider.  
**Canonical images:** PDF.js renders fixed page images; all providers receive same visual input.

Mode is part of benchmark identity.

## Service worker

Cache app shell/static assets only. Do not cache API keys, provider traffic, PDFs, generated page images, or benchmark results.
