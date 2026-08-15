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
