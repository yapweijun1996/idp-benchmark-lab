# TESTING — IDP Benchmark Lab

## Current verification status

The 2026-09-08 review at `26b0ae9` did **not** pass release acceptance. [PROJECT_STATUS.md](PROJECT_STATUS.md) records the dated check totals; the [review](docs/reviews/2026-09-08-production-readiness.md) contains the reproductions. Coverage requirements below are targets, not a claim that all paths are verified.

`src/cost/pricing.test.ts` compares a timestamp generated at test time with a fixed 2026-08-20 timestamp. The fixed date is no longer the latest, so the test fails. Use deterministic old/new timestamps or a controlled clock (TASK-066); do not change correct date sorting to satisfy the stale test.

The same run reports nine unhandled React state updates after the `App.a11y.test.tsx` environment is torn down, plus multiple missing-`act(...)` warnings in page tests. These must be awaited/cancelled rather than ignored because they can hide false positives. Lint exits successfully with two Fast Refresh warnings in `src/i18n.tsx`. The production build succeeds but reports a 1.08 MB main chunk (327 KB gzip) above Vite's 500 KB warning threshold.

## Test layers

### Unit

Mandatory targets:
- canonicalization
- hashing
- diff
- leaf flattening
- ordered row accuracy
- conservative normalization
- cost calculations
- pricing snapshots
- benchmark identity
- budget gate
- stop gate

### Provider adapter contract

Every adapter must pass common fixture tests for capabilities, request mapping, JSON extraction, usage normalization, error normalization, and secret redaction. Normal CI uses mocked network calls.

### Storage

Test IndexedDB migrations, CRUD, suite/run persistence, import/export, and secret exclusion.

### Browser/E2E

Test PDF upload, extraction template creation, Expected Result, BYOK config UI, mocked single run, mocked 5-run benchmark, Stop, budget stop, Home, export, and PWA smoke.

## pdfjs-dist in jsdom tests

The real `pdfjs-dist` module OOMs the Node process when loaded under jsdom, so `vitest.config.ts` aliases it to `src/test/pdfjs-stub.ts`. Unit tests must not import `pdfjs-dist`; they inject a fake `PdfLoader` into `usePdfDocument(blob, loader)` instead. Real PDF rendering is covered by browser smoke tests (TASK-052).

Hooks that take object/function inputs in deps must not be called with fresh inline instances per render — an effect whose dependency changes on every render loops until OOM. Pass stable references (module constants, refs, or values created outside the render callback).

## Evaluation fixtures

Include deterministic cases for:
- exact match
- missing field
- extra field
- wrong identifier digit
- `null` vs `0`
- missing/extra/duplicate/reordered row
- remark field leakage
- Vendor Article No. appended to description
- whitespace-only normalized difference
- malformed JSON
- schema-invalid JSON

## Golden Popular PO regression

Verify at minimum:
- leading-zero document number
- 13 rows
- full visible stock-description prefixes
- `remark` null when no genuine remark exists
- Vendor Article No. not repurposed
- exact `M650 M WL WHITE` where expected
- no printed requested footer totals => null

If source PDF is not committed, keep Golden JSON fixture and local test-file instructions.

## Benchmark runner tests

Required:
- requested run count is never exceeded
- Stop prevents every new request, including retries during backoff (TASK-060)
- budget checks include first requests, zero/unknown/variable costs, retries and concurrent reservations (TASK-059)
- provider failure does not corrupt suite
- retry count bounded
- concurrency never duplicates run numbers
- refresh/interruption behavior documented and tested

## Security tests

Assert no raw API key in IndexedDB, localStorage, service-worker Cache Storage, logs, or exports.

## Browser smoke (TASK-052)

`tests/e2e/smoke.spec.ts` runs against the production preview build. Shell/navigation, Library/Settings routes, unknown-hash fallback, and real PDF upload/preview passed the review. The first-time Home demo-card assertion failed: Home now links to New Benchmark rather than mounting the old card.

Both `tests/e2e/demo.spec.ts` cases still target the old Home API-key/provider controls and time out before extraction. They currently provide no proof that the active wizard completes the Gemini/OpenAI request-and-persistence path. TASK-066 must move these checks to the current flow, intercept only provider traffic, and verify real PDF rendering, request payloads, results and saved evidence. Do not remove failing assertions without replacing the lost acceptance coverage.

Run the browser suite after `npm run build` using `npm run test:e2e`. The default preview endpoint is `127.0.0.1:4173`. During review Windows rejected that port with EACCES, so a temporary configuration changed both the preview server and Playwright baseURL to 52173. That configuration was removed; do not treat port availability as an application defect.

## Accessibility (TASK-053)

`src/App.a11y.test.tsx` runs axe-core against the rendered shell and fails on serious/critical violations (color contrast disabled in jsdom).

## Security audit (TASK-054)

`src/security.audit.test.ts` asserts the service-worker precache whitelist is static app-shell extensions only (never pdf/json/txt/csv). Existing key-store and top-level backup tests do not cover nested auth headers or credential echoes in raw/parsed/error evidence; these paths failed review (TASK-058). Add persistence/export/reload checks for those paths and full invalid-backup rejection checks (TASK-062). Passing a cache whitelist test is not a full credential audit.

## CI gates and release acceptance

Current `.github/workflows/deploy.yml` runs install, lint, typecheck, unit tests and build on pushes to `main` or manual dispatch, then deploys Pages. It has no pull-request trigger or Playwright gate. The date-sensitive unit failure currently fails that test gate.

TASK-066 must require PR validation and current-flow browser tests before deployment. It must also make async page/a11y tests finish cleanly and test the supported 5/10/20/50/100 presets rather than the stale Home three-run guidance. Production acceptance also requires authorized real-provider checks from the Pages origin, browser compatibility, stress/interruption, storage migration, and PWA offline/update verification (TASK-068). See [acceptance criteria](docs/ACCEPTANCE_CRITERIA.md) and the [dependency/toolchain snapshot](docs/DEPENDENCIES.md). No paid provider requests are part of normal mocked CI.
