# MVP Acceptance Criteria

## Current release gate

**NO-GO as of 2026-09-08, reviewed code `26b0ae9`.** This checklist defines acceptance, not historical delivery. `[x]` means the current review found direct implementation/test evidence for that bounded item; `[ ]` means open, incomplete, or not verified. A checked component does not override an unchecked end-to-end or security gate. Dated evidence is in [PROJECT_STATUS.md](../PROJECT_STATUS.md) and the [review](reviews/2026-09-08-production-readiness.md).

Before production sign-off:

- [ ] TASK-058: credential-safe config, response/error evidence and exports
- [ ] TASK-059/060: budget reservations and Stop before every attempt, including retries
- [ ] TASK-061/064: immutable effective inputs/Golden/configuration and pricing basis
- [ ] TASK-062/063: validated restore and preserved failed-response evidence
- [ ] TASK-065: persisted/displayed strict and normalized metrics
- [ ] TASK-066: deterministic unit tests and active-wizard browser/PR deployment gates
- [ ] TASK-067: dependency advisories remediated or explicitly assessed for reachability
- [ ] TASK-068: recorded live-origin provider/CORS, browser, PWA, stress/interruption acceptance and release decision
- [ ] TASK-070: Home presets, full-history access, localization coverage and retired-demo behavior reconciled

Document-only updates do not satisfy these implementation or runtime gates.

## Static/PWA
- [x] static build
- [ ] GitHub Pages Actions deploy
- [x] valid generated PWA manifest
- [x] service worker configuration caches app-shell types only and has no runtime routes
- [ ] responsive desktop/tablet/mobile

## Documents
- [x] local PDF upload
- [x] PDF preview in production-build Chromium smoke
- [x] document fingerprint
- [x] visible native/canonical input mode

## Profiles
- [x] prompt editor
- [x] extraction contract
- [x] visual and advanced JSON Schema editor
- [x] version/hash fields
- [x] schema validation
- [ ] immutable historical profile versions

## Golden Answer
- [x] JSON editor
- [x] schema validation
- [x] version/hash fields
- [x] explicit save
- [ ] immutable historical Expected Result versions and approval binding

## Providers
- [x] mocked OpenAI adapter contract
- [x] mocked Gemini adapter contract
- [x] mocked Custom OpenAI-compatible adapter contract
- [ ] live supported-provider/model/CORS acceptance from Pages origin
- [ ] BYOK not persisted by default
- [x] CORS/network ambiguity diagnostics
- [ ] model/settings stored in identity

## Extraction
- [x] mocked single-run success path
- [ ] raw response is credential-redacted and preserved for parse failures
- [x] parsed JSON for successful provider output
- [x] schema status for parsed output
- [ ] usage and latency retained for successful and failed attempts
- [x] successful-run cost or explicit unknown

## Benchmark
- [x] 5/10/20/50/100 presets
- [ ] Stop
- [ ] hard budget cap
- [x] bounded retry count
- [x] no duplicate run numbers
- [x] persisted lifecycle for covered paths

## Evaluation
- [x] strict exact pass
- [x] schema-valid rate for completed normal suites
- [x] strict leaf accuracy
- [x] strict ordered-row accuracy
- [ ] strict/normalized
- [x] consistency
- [x] unique variants
- [x] strict field mismatch heatmap
- [ ] documented denominator behavior for interrupted/failed runs
- [x] successful-run latency summary
- [ ] cost
- [x] strict run inspector

## Export/QA
- [x] suite JSON export
- [x] summary/field CSV export
- [ ] backup/import
- [ ] no API key in export
- [ ] unit tests
- [x] typecheck
- [x] lint (with warnings)
- [x] build (with bundle-size warning)
- [ ] browser smoke
- [ ] storage/cache security audit
