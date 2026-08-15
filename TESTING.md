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

Test PDF upload, profile creation, Golden Answer, BYOK config UI, mocked single run, mocked 5-run benchmark, Stop, budget stop, dashboard, export, and PWA smoke.

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

## CI gates

- install
- lint
- typecheck
- unit tests
- build
- browser smoke where practical

Deploy only after gates pass.
