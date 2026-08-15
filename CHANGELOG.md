# CHANGELOG

## 2026-08-15 — Documentation Seed

Created the docs-first implementation handoff for `idp-benchmark-lab`.

Established static GitHub Pages PWA, BYOK, OpenAI/Gemini/Custom provider scope, PDF upload/preview, modular prompt/schema profile, Golden Answer, repeated 5/10/20/50/100 benchmark, cost/usage tracking, accuracy-vs-stability metrics, variant/field drift analysis, budget/stop controls, direct JSON output, and source-field isolation.

Implementation status: not started.

## 2026-08-15 — PWA Foundation Scaffold

- Vite 8 + React 19 + strict TypeScript project scaffold (`tsc -b`, ESLint 9 flat config, Vitest + Testing Library).
- Responsive app shell: desktop sidebar + mobile drawer, hash-based routing for GitHub Pages.
- Base `./` asset URLs verified against the production build.
- Reconcile P1/P2 documentation review findings (adapter contract, canonical JSON Schema draft-07 example, benchmark identity normalization policy, metric denominator definitions, ADR-015).
- 6 unit tests passing; lint, typecheck, build green.

## 2026-08-15 — Phase 1 Complete (PWA Foundation)

- Installable PWA: generated icon set (favicon/180/192/512/maskable), web manifest, `registerType: prompt` with explicit update/reload prompt.
- Service worker precaches app shell only (17 entries); runtime caching of provider traffic/PDFs/keys/results is explicitly disabled per SECURITY.md.
- GitHub Pages Actions workflow (`actions/checkout@v6`, `setup-node@v6`, `configure-pages@v6`, `upload-pages-artifact@v4`, `deploy-pages@v5`) with lint/typecheck/test/build gates.
- IndexedDB/Dexie schema v1: 8 stores matching DATA_MODEL.md, forward-only migration, unique `[suiteId+runNumber]` index enforcing no duplicate run numbers.
- 11 tests passing (app shell + storage layer); lint, typecheck, build green.

## 2026-08-15 — Documents & PDF Preview

- Documents page: local PDF upload (type-validated), SHA-256 fingerprint, session-only vs IndexedDB persistence toggle, delete, default input-mode setting persisted to app settings.
- Lazy PDF.js preview: pages render to canvas only when scrolled near the viewport; page count recorded on the document record.
- Testing notes: pdfjs-dist is aliased to a stub in jsdom tests (real module OOMs); loader is dependency-injected into `usePdfDocument`. Effect-dependency stability conventions documented in TESTING.md.
- 33 tests passing; lint, typecheck, build green.

## 2026-08-15 — Profiles & Golden Answers

- Deterministic canonical JSON serialization (recursive key sort, array order preserved) as the shared hash basis.
- Extraction profile editor: base prompt + extraction contract + JSON schema + conservative normalization policy; every save creates a new version with prompt/schema/normalization hashes for benchmark identity.
- Strict draft-07 schema validation: AJV strict mode plus an explicit keyword whitelist that rejects provider-dialect keywords such as OpenAI `nullable` (docs/JSON_SCHEMA.md).
- Golden Answer editor: two-pane JSON editor with live PDF preview, always validated against the active profile schema, versioned, never auto-rewritten.
- 69 tests passing; lint, typecheck, build green.

## 2026-08-15 — Provider Adapters & BYOK

- Normalized provider contract (`ProviderAdapter`): capabilities, `testConnection`, `extract` — benchmark code never touches provider APIs directly (ADR-008).
- OpenAI adapter (chat/completions, json_object, image input; native PDF honestly unsupported), Gemini adapter (inline PDF base64 + images, `x-goog-api-key` header so keys never enter URLs, responseSchema-ready, safety block handling), Custom OpenAI-compatible adapter (base URL validation, custom headers, capability overrides, CORS-aware diagnostics).
- Conservative JSON extraction (bare or single fenced block), status→category error normalization, network/CORS ambiguity explained without treating CORS as a model failure.
- BYOK key store: memory-only default, sessionStorage opt-in per tab, never localStorage/IndexedDB/exports — with hard tests asserting no key leakage and no key echo in connection results.
- Providers page: config cards, key input with reveal, connection testing, capability badges, explicit BYOK warning.
- 116 tests passing; lint, typecheck, build green.

## 2026-08-15 — Canonical Rendering, Pricing & Cost Engine

- Canonical rendered-image input mode: fixed-scale page rendering with page ranges, PNG/JPEG output, renderer seam for tests; settings are part of benchmark identity.
- Pricing presets are model names only (per the no-hard-coded-prices rule); users save verified `PricingSnapshot`s, and `latestFor(provider, model)` feeds the cost engine.
- Cost estimation with the documented precedence: provider-reported → usage × snapshot (partial usage counts only known parts) → flat per-request → unknown (undefined, never rendered as zero).
- 130 tests passing; lint, typecheck, build green.
