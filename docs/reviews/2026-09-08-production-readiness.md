# Production readiness review

Date: 2026-09-08. Repository: idp-benchmark-lab. Reviewed HEAD: `26b0ae9`.

**Review: complete. Production recommendation: NO-GO.** The application remains a demo/spike. Its static browser architecture is appropriate for the stated product, but spending controls, credential boundaries, historical evidence, backup validation, and release verification are not ready for production reliance. This is a review, not a remediation or deployment.

## Scope and evidence

Reviewed the required project documents, provider adapters, runner and single-run paths, evaluation and cost modules, storage, backup/export, active wizard/results pages, PWA configuration, tests, and deployment workflow. The working tree was clean at the start. No application code, dependencies in the lockfile, or deployment configuration was changed.

KB-MCP bootstrap and Skill Registry/project searches were used. The bootstrap's legacy explicit agent ID was rejected; omitting the ID successfully used the authenticated server-derived identity. Retrieved material concerned other IDP/KB projects and did not establish this repository's production readiness. It was not treated as release evidence. SCMC and current repository code/tests supplied the review criteria and evidence.

Preserved acceptance boundaries: static GitHub Pages, no required backend or hidden proxy, BYOK, memory-only credentials by default, local evidence, explicit failure states, immutable benchmark configuration, separate accuracy/stability, user-controlled Golden Answer, and no silent value normalization or inference.

## Verification results

| Check | Observed result |
| --- | --- |
| Dependency installation | `npm ci --ignore-scripts` succeeded; lockfile unchanged |
| Lint | PASS |
| Typecheck | PASS |
| Production build | PASS; PWA generated; main JS approximately 1.08 MB before gzip |
| Existing Vitest suite | 293 passed, 1 failed; 52 test files |
| Existing Playwright suite, Chromium | 5 passed, 3 failed |
| Isolated defect reproductions | 10/10 reproduced the current defects; these are not remediation tests passing |
| Dependency audit | Four high-severity affected dependency entries; includes transitive dependency chains, not four proven application exploits |

The default preview port 4173 failed to bind with Windows EACCES. The unchanged browser test cases were rerun using a temporary configuration on port 52173. Those runs reached the production build. Temporary test/configuration files were removed after the review. Only synthetic credentials and mocked provider responses were used.

Not verified: paid live provider requests, provider CORS from the deployed Pages origin, current deployed commit/Actions status, Firefox/Safari behavior, large-document stress, interruption recovery in a real browser, or a complete PWA update/offline lifecycle. No conclusion about live provider compatibility is inferred from mocked tests.

## Findings

### R1 — P1: the hard budget cap does not bound spending

Locations: `src/benchmarks/runner.ts:201`, `src/benchmarks/runner.ts:238`, `src/pages/RepeatedBenchmarkSection.tsx:169`.

The gate returns false until a prior run has a known cost. It then uses the most recent cost as its estimate and makes no reservation for concurrent requests. Unknown-cost runs continue, without the warning promised by the nearby comment. A previous response's cost is not an upper bound for a subsequent response.

Reproduced: a zero-dollar cap still makes one request costing $1. With five workers, a $1 cap permits five $1 requests and records $5 spent. The existing unknown-cost test also explicitly expects continued execution.

Correction: enforce a shared reservation/check before every network attempt, validate finite nonnegative budgets, account for in-flight reservations, and fail closed when a safe bound cannot be established. Preserve completed evidence and graceful completion of already-started requests. If only an estimate is feasible, label it honestly and require a distinct product decision before replacing the hard-cap contract. Verify zero budget, unknown usage, variable costs, concurrency, retries, and a cost exactly at the cap.

### R2 — P1: Stop does not prevent retry requests

Location: `src/benchmarks/runner.ts:140` and `src/benchmarks/runner.ts:177`.

Stop is checked in the outer worker loop but not inside the retry loop. Reproduced: Stop during backoff still starts a second adapter call. This violates FR-009 even though no new run number is created. Budget checks also do not run at this attempt boundary.

Correction: check stop/budget immediately before every adapter invocation, including retries, and make backoff interruptible. Keep the documented behavior that an already-started request may finish. Verify no second request after Stop during a retry delay.

### R3 — P1: authentication headers and echoed credentials persist and export

Locations: `src/providers/configService.ts:16`, `src/providers/openai-compatible.ts:211`, `src/export/backup.ts:67`, `src/export/backup.ts:89`, `src/benchmarks/runner.ts:150`, `src/benchmarks/runner.ts:188`, `src/providers/common.ts:40`.

Custom headers are accepted through the provider UI and saved inside `settings.customHeaders`. These headers can contain Authorization or API keys, and override the memory-only Authorization header. Backups copy provider configs directly. The import secret check examines only top-level keys, so nested credentials pass. Raw response strings, parsed JSON, and provider error messages also reach persistence without credential redaction.

Reproduced: a synthetic Authorization header persisted in IndexedDB, appeared in backup JSON, and survived import. Separate controlled responses showed synthetic credential echoes persisted in raw response and error records. This proves an unsafe path, not an observed real credential leak.

Correction: separate secret headers from persistable configuration; keep them in the existing ephemeral credential store. Validate/allowlist exported configuration and apply credential-aware redaction at the evidence boundary, including error messages and derived fields. Preserve non-secret document evidence. Verify nested headers and success/error echoes across storage, backup, suite export, and reload.

### R4 — P1: historical benchmark evidence is not immutable

Locations: `src/golden/service.ts:60`, `src/profiles/service.ts:52`, `src/pages/RunsResultsPage.tsx:22`, `src/benchmarks/runner.ts:263`, `src/benchmarks/singleRun.ts:157`.

Golden/profile updates increment a version but overwrite the record under the same ID. The results page retrieves Golden data by that mutable ID. Reproduced: a suite records Golden v1/hash A, an edit creates v2/hash B under the same ID, and the historical lookup now returns v2. Scores remain from the old answer while the inspector can show the new one.

Benchmark identity also omits custom endpoint/API-style settings. A controlled runner test returned identical identities for different custom endpoint/config settings. Prompt/schema overrides are hashed but their complete values are not retained in a suite snapshot. A hash can detect a difference; it cannot reconstruct discarded input. Build identity uses package version alone, so distinct commits sharing 0.1.0 are indistinguishable there.

Correction: freeze an immutable, secret-free input/configuration snapshot per suite, or retain immutable versions and reference those versions. Include effective adapter settings and a unique build identifier. Resolve historical inspectors/exports from frozen data. Verify edits/deletes and endpoint changes cannot relabel old evidence.

### R5 — P1: backup replace accepts malformed data before deleting existing records

Locations: `src/export/backup.ts:101`, `src/export/backup.ts:150`, `src/export/backup.ts:158`.

Validation requires only an array of objects with string IDs. It does not validate each entity's fields, enums, types, links, hashes, or version relationships. Replace clears existing tables inside a transaction; that transaction then successfully commits structurally invalid records because IndexedDB accepts them.

Reproduced: a profile containing only `{ "id": "malformed" }` was accepted, the existing valid profile was removed, and the malformed row persisted.

Correction: validate the full supported backup schema and cross-record relationships before any mutation, then retain the atomic transaction. Verify malformed entity data is rejected and the previous database remains unchanged. Do not confuse transaction atomicity with input validity.

### R6 — P1: malformed provider output loses the evidence needed to evaluate failures

Locations: `src/providers/gemini.ts:159`, `src/providers/openai.ts:107`, `src/providers/openai-compatible.ts:164`, `src/benchmarks/runner.ts:184`.

Adapters throw on non-JSON output before returning raw text or usage. The runner stores a generic provider_error, even though parse_error exists in the model. A received, potentially billable extraction is therefore recorded without its raw response, usage, or latency; parse failures are conflated with provider failures.

Reproduced with the real Gemini adapter and intercepted HTTP response: a 200 response with malformed text and token usage resulted in provider_error with no safeRawResponse or usage.

Correction: preserve a redacted response envelope independently of parsing/evaluation, classify parse errors separately, and retain usage/timing/cost evidence for failed outputs and attempts. Verify malformed JSON, empty output, truncation, provider failure, and retry histories.

### R7 — P2: pricing is selected during each response instead of frozen at suite start

Location: `src/benchmarks/execute.ts:121`.

Each extraction rereads the configured pricing record or latest provider/model price. Suite/run records do not retain the applied pricing snapshot/source. Reproduced: adding a newer flat-rate record between two responses changed costs within one suite from $1 to $10. Recorded numeric costs remain, but their pricing basis cannot be audited from the suite alone.

Correction: resolve immutable pricing at suite creation and retain its source and rates with the evidence. Verify changing price configuration during execution affects only future suites.

### R8 — P1 release gate: automated release evidence is currently failing and stale

Locations: `src/cost/pricing.test.ts:41`, `tests/e2e/demo.spec.ts:35`, `tests/e2e/demo.spec.ts:84`, `tests/e2e/smoke.spec.ts:14`, `.github/workflows/deploy.yml:35`.

The pricing test generates the supposedly old record with today's date but fixes the supposedly current record at 2026-08-20. On 2026-09-08, latestFor correctly selects the newer 0.1 record, while the test expects 0.15. This is a time-dependent test defect, not evidence that the sorting implementation is wrong; it still fails the current test/deploy gate.

Three E2E cases seek the removed Home demo card/API-key/provider controls. The active Home page routes to the wizard instead, so those cases fail before verifying extraction. Five shell/navigation/PDF-preview cases pass. This does not establish that live extraction is broken, but it removes the claimed browser proof for it.

The workflow runs lint/typecheck/unit/build but never Playwright, and has no pull_request trigger. README/TESTING/TASK completion claims are inconsistent with the tested active UI and current failures.

Correction: make time fixtures deterministic, align E2E tests with the actual wizard flow, and require browser tests before deployment plus PR validation. Verify the active PDF-to-request-to-evidence path, Stop, budget, backup round-trip, and PWA behavior before restoring the release claim.

### R9 — P2: normalized metrics are calculated but discarded

Locations: `src/evaluation/metrics.ts:57`, `src/benchmarks/runner.ts:147`, `src/benchmarks/singleRun.ts:107`, `src/storage/types.ts:139`.

The pure evaluator produces strict and normalized metrics, but persisted run records retain only strict results. The active result/summary UI has no normalized counterpart. FR-014's requirement to show both is therefore incomplete despite the evaluator unit coverage.

Correction: preserve and label both metric sets with the normalization policy, without changing strict scores or silently repairing Golden data. Verify whitespace-only differences through execution, persistence, reload, and export.

### R10 — P2: dependency advisories need resolution and reachability review

Audit finds fast-uri 3.1.5 through AJV and sharp 0.33.5 through @vite-pwa/assets-generator, plus affected parent-chain entries. Top-level sharp 0.35.3 does not replace the nested copy.

The [fast-uri advisory](https://github.com/advisories/GHSA-5jgf-p345-68v8) identifies URI host confusion and includes 3.1.6 as a patched version. The [sharp advisory](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) covers inherited libvips vulnerabilities in versions before 0.35.0. These were checked against current advisory pages.

No application exploit was demonstrated. In particular, a generic SSRF label must not be treated as proof of server-side exposure in this static app, and the nested sharp path is build tooling. Upgrade or remove affected dependencies through a reviewed lockfile change, assess reachable functionality, and rerun the audit/build. Do not blindly apply the audit's suggested major downgrade of vite-plugin-pwa.

## SCMC Review

| Dimension | Result | Evidence and consequence |
| --- | --- | --- |
| Simple | PASS | Static app with small domain modules; no unnecessary backend |
| Clear | FAIL | Hard-cap and complete-test claims disagree with observable behavior |
| Modular | WARN | Provider adapters and pure evaluation are useful boundaries; identity construction is duplicated between single/repeated execution, while secret handling lacks one enforced persistence boundary |
| Consistent | FAIL | Mutable historical references, incomplete normalized result persistence, and obsolete browser tests contradict declared contracts |

Overall: **FAIL**. Preserve the static/BYOK architecture and domain modules; a rewrite or backend is not required to fix these findings.

## Recommended release sequence

1. Repair credential persistence/export and per-attempt Stop/budget enforcement.
2. Freeze suite input/Golden/provider/pricing evidence; retain failed-response evidence and validate backups fully.
3. Restore deterministic unit and active-flow E2E gates, address dependency advisories, and reconcile documentation.
4. With test credentials explicitly supplied for that purpose, verify each supported provider from the real Pages origin and run browser/PWA/interruption acceptance before a production release decision.

Until those gates pass, use only controlled evaluation with non-sensitive sample documents and restricted test credentials; do not rely on the app for guaranteed spending limits or immutable production benchmark evidence.
