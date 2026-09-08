# TESTING — IDP Benchmark Lab

## Current verification status

The original review at `26b0ae9` is historical. [Remediation evidence](docs/reviews/2026-09-08-production-remediation.md) records current results, residual failures and external acceptance gaps.

`src/cost/pricing.test.ts` freezes Date with Vitest fake timers and restores real timers. Sorting behavior remains unchanged. See [Vitest date mocking](https://v3.vitest.dev/guide/mocking.html#dates).

Page/a11y tests await asynchronous effects, and subscription/provider hooks stop updates after unmount. Lint retains two pre-existing Fast Refresh warnings in i18n.tsx; the main build chunk remains above Vite's advisory size threshold. Neither warning is hidden or treated as a failed assertion.

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

`tests/e2e/smoke.spec.ts` tests the production build, active Home → wizard entry, navigation and real PDF rendering.

`tests/e2e/demo.spec.ts` traverses the six-step wizard with synthetic BYOK, intercepts provider traffic, checks real PDF/image requests and redacted malformed evidence, refuses unbounded hard-cap execution, checks Stop, runs 100 requests, restores backup and recovers interrupted work without replay.

Run `npm run build`, then `npm run test:e2e`. The local preview endpoint is 127.0.0.1:52173. Playwright installs Chromium, Firefox and WebKit via `npx playwright install --with-deps`; CI uses one worker following [Playwright CI guidance](https://playwright.dev/docs/ci).

## Accessibility (TASK-053)

`src/App.a11y.test.tsx` runs axe-core against the rendered shell and fails on serious/critical violations (color contrast disabled in jsdom).

## Security audit (TASK-054)

`src/security.audit.test.ts` checks the app-shell cache whitelist. Additional redaction and production regression tests cover nested/serialized/malformed headers, echoes, in-flight credential clearing, migration and rejected backups. These synthetic tests do not prove arbitrary provider behavior.

## CI gates and release acceptance

The deploy workflow runs on PRs, main pushes and manual dispatch. Audit and all browser projects join lint/typecheck/unit/build before deployment; PRs cannot deploy. Reports are retained as CI artifacts.

Production acceptance additionally requires the user-published Pages revision, authorized real BYOK provider/CORS checks, actual browser/PWA installability and a successful remote rerun of the corrected WebKit offline PWA driver. Normal CI uses no paid credentials. See [acceptance criteria](docs/ACCEPTANCE_CRITERIA.md).
