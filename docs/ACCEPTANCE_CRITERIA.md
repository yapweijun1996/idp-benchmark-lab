# MVP Acceptance Criteria

## Current release gate

**NO-GO as of 2026-09-08.** Checked items have bounded local implementation/regression evidence in the [remediation report](reviews/2026-09-08-production-remediation.md). The last published checkpoint has remote CI and Pages evidence; this local PWA/i18n follow-up is pending its remote rerun. Live-provider contract and target-device acceptance remain unchecked; local mocks do not certify them.

Before production sign-off:

- [x] TASK-058: credential-safe config, response/error evidence and exports
- [x] TASK-059/060: budget reservations and Stop before every attempt, including retries
- [x] TASK-061/064: immutable effective inputs/Golden/configuration and pricing basis
- [x] TASK-062/063: validated restore and preserved failed-response evidence
- [x] TASK-065: persisted/displayed strict and normalized metrics
- [x] TASK-066: deterministic unit tests and active-wizard browser/PR deployment gates
- [x] TASK-067: dependency advisories remediated or explicitly assessed for reachability
- [ ] TASK-068: recorded live-origin provider/CORS, browser, PWA, stress/interruption acceptance and release decision
- [x] TASK-070: Home presets, full-history access, localization coverage and retired-demo behavior reconciled

Document-only updates do not satisfy these implementation or runtime gates.

## Static/PWA
- [x] static build
- [x] GitHub Pages Actions deploy (last published checkpoint)
- [x] valid generated PWA manifest
- [x] service worker configuration caches app-shell types only and has no runtime routes
- [x] responsive desktop/tablet/mobile navigation in browser matrix

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
- [x] immutable historical profile versions

## Golden Answer
- [x] JSON editor
- [x] schema validation
- [x] version/hash fields
- [x] explicit save
- [x] immutable historical Expected Result versions and approval binding

## Providers
- [x] mocked OpenAI adapter contract
- [x] mocked Gemini adapter contract
- [x] mocked Custom OpenAI-compatible adapter contract
- [ ] live supported-provider/model/CORS acceptance from Pages origin
- [x] BYOK not persisted by default
- [x] CORS/network ambiguity diagnostics
- [x] model/settings stored in identity

## Extraction
- [x] mocked single-run success path
- [x] raw response is credential-redacted and preserved for parse failures
- [x] parsed JSON for successful provider output
- [x] schema status for parsed output
- [x] usage and latency retained for successful and failed attempts
- [x] successful-run cost or explicit unknown

## Benchmark
- [x] 5/10/20/50/100 presets
- [x] Stop
- [x] hard budget cap with an accurately sourced provider-contract bound; unknown bound refuses execution
- [x] bounded retry count
- [x] no duplicate run numbers
- [x] persisted lifecycle for covered paths

## Evaluation
- [x] strict exact pass
- [x] schema-valid rate for completed normal suites
- [x] strict leaf accuracy
- [x] strict ordered-row accuracy
- [x] strict/normalized
- [x] consistency
- [x] unique variants
- [x] strict field mismatch heatmap
- [x] documented denominator behavior for interrupted/failed runs
- [x] successful-run latency summary
- [x] cost
- [x] strict run inspector

## Export/QA
- [x] suite JSON export
- [x] summary/field CSV export
- [x] backup/import
- [x] no API key in export
- [x] unit tests
- [x] typecheck
- [x] lint (with warnings)
- [x] build (with bundle-size warning)
- [x] browser smoke
- [x] storage/cache security audit
- [x] versioned update prompt, About build identity, and five-locale UI coverage
