# SPEC — IDP Benchmark Lab

## Scope

A static GitHub Pages PWA for repeatable IDP extraction benchmarking using BYOK provider credentials.

## Implementation acceptance status

This specification defines required behavior. It is not a completed-feature checklist. The [2026-09-08 review](docs/reviews/2026-09-08-production-readiness.md) found acceptance gaps in FR-006, FR-009..012, FR-014, FR-017..019 and release verification. Additional code review found incomplete localization, truncated history views, and UI/preset drift. Production remains **NO-GO**; see [TASK.md](TASK.md) for remediation. The requirements below are retained rather than weakened to match current defects.

## Functional requirements

### FR-001 PDF upload
User can select a local PDF without uploading it to an application-owned backend.

### FR-002 PDF preview
App renders PDF pages locally.

### FR-003 Extraction profile
User can create/edit/version base prompt, extraction contract, JSON schema, name, and version.

### FR-004 Golden Answer
User can create a Golden Answer JSON and validate it against the active schema.

### FR-005 Provider support
MVP: OpenAI, Gemini, Custom OpenAI-compatible.

### FR-006 BYOK
User supplies provider API key at runtime. Keys are not committed, sent to an app backend, or persisted by default.

### FR-007 Single run
Run one extraction and inspect result before a benchmark.

### FR-008 Repeated benchmark
Presets: 5, 10, 20, 50, 100.

### FR-009 Stop
No new requests start after user requests Stop.

### FR-010 Budget cap
User can set `max_budget_usd`; before every provider attempt, including retries, a safe reservation must prove that confirmed plus in-flight maximum spend cannot exceed the cap. Unknown-cost attempts cannot be presented as hard-capped.

### FR-011 Local persistence
Profiles, Golden Answers, provider configs without secrets, suites, runs, pricing snapshots, and results persist in IndexedDB.

### FR-012 Raw response preservation
Each run stores safe raw response, parsed JSON, schema status, evaluation, usage, latency, error, and hash. Secrets must be redacted.

### FR-013 Evaluation
At minimum calculate exact pass rate, schema-valid rate, leaf-field accuracy, row accuracy, consistency, unique variants, error rate, avg/p50/p95 latency, total cost, average cost/run, cost/correct run.

### FR-014 Strict vs normalized
Show both. Normalization must be conservative and transparent.

### FR-015 Variant analysis
Canonical JSON outputs are hashed and grouped.

### FR-016 Field heatmap
Identify fields with repeated mismatch rates.

### FR-017 Benchmark identity
Store immutable snapshots/fingerprints of document, prompt, schema, Golden Answer, provider, model, thinking/reasoning, temperature, input mode, renderer settings, and app build.

### FR-018 Export
Export full JSON, CSV summaries, field accuracy, provider config without secrets, and project backup.

### FR-019 Import
Import validated backup/project data.

### FR-020 GitHub Pages
Auto-deploy static build through GitHub Actions.

## Implemented post-MVP extensions

These behaviors exist in the current codebase but do not override the production acceptance gaps above.

### EXT-001 Guided workflow
Use a six-item task-oriented shell and a six-step New Benchmark wizard. The current Home page links into the wizard; it does not run the retained `DemoBenchmarkCard` inline.

### EXT-002 Bundled samples and visual schema editing
Auto-seed the synthetic Popular PO and Nexabyte PO documents, templates, and Expected Results. The wizard can select them, accept a local upload, edit the current run's prompt, and keep a visual field editor synchronized with the advanced JSON Schema draft. No provider config or offline gateway is auto-created.

### EXT-003 Localization
Offer English (`en`), Mandarin (`zh`), Malay (`ms`), Japanese (`ja`), and Vietnamese (`vi`), with the preference stored in `AppSettings`. Missing translations currently fall back to English or the source key; complete page-level localization and QA remain TASK-070.

### EXT-004 Provider configuration controls
Allow editable model IDs, OpenAI reasoning effort, Gemini thinking level, and Custom OpenAI-compatible `chat_completions`/`responses` style. Suggestions are not compatibility guarantees; capability and live-origin verification remain provider/model specific.

### EXT-005 History access
Stored suites remain in IndexedDB, but the current Home/Runs/Compare hook loads only the most recent 20. Pagination or explicit retention/disclosure is required by TASK-070 before the UI can claim access to every historical benchmark.

## Input modes

### Native PDF
Provider receives original PDF using provider-supported path.

### Canonical Rendered Images
Browser renders PDF to fixed page images so providers receive the same visual input.

Results must identify input mode.

## Custom provider MVP

OpenAI-compatible HTTP endpoint with base URL, model, API key, optional headers, capability flags, and configurable pricing. Provider must allow browser CORS.

## Accuracy rules

- Exact: canonical structural equality with Golden Answer.
- Leaf: matching Golden leaf values / total Golden leaves.
- Rows: ordered by index in MVP.
- `null` differs from zero and empty string.
- identifiers are character-sensitive.

## Cost precedence

1. provider-reported monetary cost when trustworthy/available
2. usage × pricing snapshot
3. user-configured flat request cost
4. unknown

Never display zero cost merely because usage was unavailable.

## Non-functional requirements

- static hosting
- local-first privacy
- failed run must not corrupt suite
- deterministic evaluation/hashing
- responsive desktop/tablet/mobile
- accessible keyboard/focus/contrast
- modern Chromium/Firefox/Safari
- no secret in service-worker cache

## Constraints

- static Pages cannot hide provider secrets
- BYOK keys exist in browser runtime
- provider/custom CORS may block direct calls
- PDF/structured-output capabilities differ by provider
- pricing/API contracts change

## Acceptance boundary

The spike succeeds when it can produce saved evidence showing whether the same configuration is accurate and stable over repeated requests.
