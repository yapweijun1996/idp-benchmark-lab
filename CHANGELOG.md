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

## 2026-08-15 — Single Extraction Run (Phase 2 complete)

- `SingleRunService`: orchestrates document/profile/provider/golden into one extraction — BYOK lookup, prompt composition, native-PDF or canonical-image input preparation, capability gates, adapter call, schema evaluation, cost estimation, and latency measurement.
- Immutable benchmark identity snapshot on every suite (document/profile/prompt/schema/normalization/golden/provider/model/thinking/temperature/mode/renderer/build), with the app build injected from package.json.
- Run evidence persisted immediately: state, safe raw response, parsed JSON, schema validity, output hash, usage, cost, normalized error; provider failures mark the run `provider_error` and the suite `failed` without corrupting data.
- Benchmarks page: single-run form (mode/temperature/thinking), result panel with raw + parsed JSON, recent-run history.
- 140 tests passing; lint, typecheck, build green.

## 2026-08-15 — Benchmark Harness Core (Phase 3)

- Shared extraction engine (`execute.ts`): the single run and the repeated runner now share one provider path, so behavior cannot drift between them.
- `BenchmarkRunner`: 5/10/20/50/100 presets, bounded concurrency with unique run numbers (DB-level unique index backs this), Stop gate that starts no new runs, retry with exponential backoff (non-retryable errors never retried; actual attempt count recorded), and a hard budget cap that stops before a run whose projected cost would exceed the cap.
- Budget semantics per docs: unknown cost never blocks execution and is never rendered as zero; interrupted-suite recovery remains a documented future option.
- Suite lifecycle persisted: running → completed/stopped/budget_stopped/failed with per-run evidence written immediately.
- 150 tests passing; lint, typecheck, build green.

## 2026-08-15 — Evaluation Engine

- Leaf flattening with index paths (`row_data[0].remark`), null kept as a leaf; conservative normalization (trim + line endings only, trim-before-normalize ordering fixed by tests).
- Per-run evaluation: exact match (strict + normalized), leaf accuracy with mismatch path/expected/actual, ordered row comparison (missing/extra/duplicate detection), all wired into every single and repeated run's persisted evidence.
- Variant grouping by canonical output hash with percentages and representative run numbers; stability metrics (consistency rate, golden stability) with division guards per EVALUATION.md.
- Test fixtures cover the documented cases: missing/extra fields, wrong identifier digits, null vs 0, remark leakage, row missing/extra/duplicate/reordered, whitespace-only differences.
- 172 tests passing; lint, typecheck, build green.

## 2026-08-15 — Benchmark Progress & Results Dashboard

- Benchmarks page: repeated benchmark builder (5/10/20/50/100 presets, concurrency, hard budget cap), live progress (completed/total with per-outcome counts), Stop button wired to the runner's stop gate.
- Results summary panel: exact pass rate, schema-valid rate, avg leaf accuracy, row accuracy, consistency, unique variants, golden stability, error rate, latency avg/p50/p95 (linear-interpolation percentiles), cost total/avg/per-correct — all with documented denominators and division guards.
- Runner progress callback (`onRunComplete`) per terminal run; summary aggregation uses raw row totals (matched/golden rows), not averaged ratios.
- 190 tests passing; lint, typecheck, build green.

## 2026-08-15 — Field Heatmap & Run Inspector

- Per-run strict leaf mismatches (path/expected/actual) are persisted with run evidence.
- Field accuracy heatmap: per-path mismatch rates over evaluated runs plus observed expected→actual value frequencies (field stability view, e.g. `row_data[1].remark` null → "920-007596").
- Suite detail view on the Benchmarks page: heatmap table, ordered run list, and a run inspector with mismatch table, parsed JSON, Golden Answer, and raw provider response.
- Latency (avg/p50/p95/min/max) and cost (total/avg/per-correct) statistics verified as covered by the summary panel.
- 199 tests passing; lint, typecheck, build green.

## 2026-08-15 — Compare & Export (Phase 4 complete)

- Compare screen: multi-select suites, side-by-side metric table (status, attempted, exact pass, schema-valid, leaf/row accuracy, consistency, variants, latency, cost) with a runs-loader seam for tests.
- Export per suite: full JSON bundle (format version, app build, suite, runs, summary, field accuracy — no secrets), summary CSV (documented columns), field-accuracy CSV with observed value pairs; RFC 4180 escaping; browser download helper.
- Suite detail view gains Export JSON / summary CSV / field CSV buttons with download tests.
- 213 tests passing; lint, typecheck, build green.

## 2026-08-15 — Backup/Import & Golden PO Fixture (Phase 5 complete)

- Project backup: full bundle (formatVersion, appVersion, entities) with document blobs as base64; Settings page export.
- Import with strict validation before any write: JSON structure, string record ids, and secret-like fields (apiKey/authorization/x-api-key/key, case-insensitive) are rejected without touching existing data; replace and merge modes.
- Golden Popular PO fixture committed (TS module + JSON example): 13 rows, leading-zero document number, exact "LOGITECH M650 M WL WHITE", null remarks and footer — enforced by an executable contract test.
- 229 tests passing; lint, typecheck, build green.
