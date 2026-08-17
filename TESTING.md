# TESTING — IDP Benchmark Lab

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
- Stop prevents new runs
- budget gate prevents new run
- provider failure does not corrupt suite
- retry count bounded
- concurrency never duplicates run numbers
- refresh/interruption behavior documented and tested

## Security tests

Assert no raw API key in IndexedDB, localStorage, service-worker Cache Storage, logs, or exports.

## Browser smoke (TASK-052)

`tests/e2e/smoke.spec.ts` (Playwright, Chromium) verifies against the production preview build: shell/title/navigation render on the Home page, the Home demo card is ready to run for a first-time visitor with no setup (bundled sample checklist, provider/run-count defaults, Run Benchmark button, secondary upload-your-own link), hash routing reaches the Library page's Documents tab, the Library's Extraction Templates tab and Settings' AI Providers tab render, a PDF upload renders a preview canvas, and unknown hashes fall back to Home. Legacy pre-redesign routes (`#/dashboard`, `#/documents`, `#/profiles`, `#/golden`, `#/providers`, `#/benchmarks`) redirect via `LEGACY_REDIRECTS` in `src/app/routes.ts`; the exercised routes above already cover their redirect targets.

`tests/e2e/demo.spec.ts` runs the Home demo card's full real pipeline — the bundled demo PDF (inlined as a `data:` URL by Vite, since it's under the 4KB inline threshold) is actually fetched into a Blob, `seedDemoFixture` actually writes to IndexedDB, and `BenchmarkRunner`/the Gemini adapter build and send a real request — with only the network call to `generativelanguage.googleapis.com` intercepted (`page.route`) and answered with a fixed fake response, so no real API key is required. Confirms the result renders on Home and the run appears in Runs & Results afterward.

## Accessibility (TASK-053)

`src/App.a11y.test.tsx` runs axe-core against the rendered shell and fails on serious/critical violations (color contrast disabled in jsdom).

## Security audit (TASK-054)

`src/security.audit.test.ts` asserts the service-worker precache whitelist is static app-shell extensions only (never pdf/json/txt/csv); key non-persistence and export/backup secret rejection are covered in `src/providers/keys.test.ts` and `src/export/backup.test.ts`.

## CI gates

- install
- lint
- typecheck
- unit tests
- build
- browser smoke where practical

Deploy only after gates pass.
