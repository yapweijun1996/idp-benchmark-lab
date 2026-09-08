# Production remediation evidence — 2026-09-08

## Decision and scope

**NO-GO for production; local remediation, remote CI and Pages deployment are complete, while authorized live-provider evidence remains open.** The user pushed commit `90090be` to GitHub. Actions run [34188671876](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34188671876) passed the complete gate, and Pages deployment `6320937240` is successful at `https://yapweijun1996.github.io/idp-benchmark-lab/`. No application server, proxy or paid request was introduced by this task.

The initial review at `26b0ae9` remains historical evidence. The accepted remediation revision is `90090be`; it includes the WebKit test fix, Actions runtime refresh, current model suggestions and synchronized evidence. Node 25.2.1, npm 11.6.2, Vitest 3.2.7 and Playwright 1.62.1 were used on Windows. Each build records its committed SHA in the run identity; the Pages deployment and remote gate identify the published revision.

## Remediated behavior

| Tasks | Change and regression evidence |
| --- | --- |
| 058 | All custom headers are ephemeral; recursive persistence/export redaction covers nested, serialized and malformed credential fields, known echoes, errors and URL credentials. Provider/data deletion clears credentials. In-flight redaction survives clearing. See `src/providers/redaction.test.ts` and `src/benchmarks/production.test.ts`. |
| 059–060 | Every attempt checks Stop and reserves a contract maximum after asynchronous preparation. Unknown billing retains the full reservation; concurrency and retry backoff cannot bypass the ledger. Missing bounds reject hard-cap execution before a request. Six ledger tests and runner regressions cover zero, unknown, variable costs, concurrent reservations and Stop. |
| 061, 064 | Suites freeze PDF bytes, canonical image bytes rendered once, effective prompt/schema, profile/Golden versions, endpoint/settings, pricing and build identity. Historical results read snapshots. Version-2 migration retains records, redacts old credentials and converts legacy PDF Blobs into portable buffers. Tests mutate/delete source records, migrate actual binary data, and round-trip backups. |
| 062–063 | Whole-backup entity/hash/reference/credential validation occurs before writes. Merge also validates the retained graph within the transaction. Malformed provider responses preserve envelopes, usage, latency and parse_error. Retry attempts and durable dispatch intent are retained. No request is automatically replayed after interruption. |
| 065 | Strict and normalized exact/leaf/row metrics and policy persist/display/export separately. Exact/schema rates use terminal runs; error rate includes cancelled/parse/provider failures over requested runs. Unknown totals remain unknown while known retry subtotals remain visible. |
| 066–067 | Fixed Date fixtures and asynchronous test teardown; active six-step wizard replaces obsolete Home tests. PR/main CI runs lint, typecheck, unit, build, audit and three browser engines before Pages deployment. fast-uri resolves to 3.1.7 and sharp to 0.35.4 throughout the asset toolchain. |
| 070 | Home guidance uses five runs; all retained suites are queryable and live updates reach inspectors. A regression exposes 25 suites. Five-language shell selection and untranslated-source fallback are tested. Retired inline-demo code/tests were removed. |

The hard-cap contract depends on an accurate, sourced provider maximum covering all billable input, output and reasoning. A historical average or arbitrary flat estimate is not a safe bound. The browser cannot constrain a provider that violates its billing contract. New suites persist source bytes even if the library upload was session-only; this is disclosed as local run evidence.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run lint` | Pass; two pre-existing Fast Refresh warnings in `src/i18n.tsx` |
| `npm run typecheck` | Pass |
| `npm test` | 55 files, 312 tests passed; no unhandled errors or React act warnings. The final TypeScript option and pre-dispatch classification corrections were followed by a passing typecheck and 20 focused regressions. |
| `npm run build` | Pass; 18 PWA precache entries including the PDF worker; main chunk 1,114.04 kB / 337.47 kB gzip remains above the advisory threshold |
| `npm audit --json` and `npm audit --omit=dev --json` | Zero advisories |
| `npm run test:e2e` | 46 passed, 2 skipped (non-Chromium update probes); 48 cases, 2.2 minutes after `9bbf744` |
| GitHub Actions [34188671876](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34188671876) | Complete required gate passed: lint, typecheck, unit tests, build, audit, Chromium/Firefox/WebKit browser acceptance and evidence upload |
| GitHub Pages deployment `6320937240` | Published SHA `90090be0c123c9044bbe3e8b2dc16f6b358672b5`; status success; public origin returned HTTP 200 and the current six-step wizard/update UI |
| `git diff --check` | Pass |

Browser checks use synthetic credentials and intercepted provider responses. They traverse the wizard, retain real PDF/image payloads, exercise malformed output, cap refusal and Stop, run 100 requests at concurrency 10, restore/export/reload, and recover interruption without replay. A synthetic 100-page PDF tests page discovery and bounded lazy preview; it is not a claim about worst-case scanned-document throughput. Phone/tablet viewport navigation is included. Local Chromium update testing changes/restores only generated `dist/sw.js`; Firefox/WebKit update copies are intentionally skipped to keep one writer.

After the final pre-dispatch error-classification correction, the focused hard-budget/Stop Playwright subset passed 6/6 across Chromium, Firefox and WebKit.

The initial concurrent browser matrix had Firefox initialization and WebKit stress navigation timeouts. Browser tests now use one worker (including locally), actual sidebar navigation after reload and a scoped 120-second allowance for the 100-run restore test. Failures were retained while investigating, rather than relabelled as application passes.

Windows WebKit automation reload returned `WebKit encountered an internal error` after a service worker was ready and controlling the page. A minimal standalone HTML + cache-only service worker reproduced the same failure without application code. Playwright's page-initiated `location.reload()` path avoids the affected automation reload path; `9bbf744` applies that driver only to the offline assertion. The corrected full local matrix is 46 passed and 2 skipped; remote CI and actual Safari/Linux WebKit still require verification.

## Official contract and pricing research

- OpenAI's documented JSON-object mode does not guarantee schema adherence. The adapter keeps JSON mode and local AJV validation; it does not claim provider-native JSON Schema enforcement. [Structured outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
- Pricing depends on exact model, tier, modality/context and cache treatment. No timeless built-in tariff was added. Users enter a dated source and rates for their selected contract; historical snapshots never reread a new price. [OpenAI pricing](https://developers.openai.com/api/docs/pricing).
- Google's current pricing page lists `gemini-3.5-flash-lite` at USD 0.30 input, 2.50 output and 0.03 cached input per million tokens for the paid Standard tier, with thinking included in output billing; `gemini-3.1-flash-lite` is also listed with a separate current rate. These are research evidence, not app defaults or an execution upper bound. Gemini usage normalization includes reported thought tokens. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [GenerateContent usage metadata](https://ai.google.dev/api/generate-content).
- Gemini native PDF requests follow its inline document input shape. Custom OpenAI-compatible services have no universal contract or CORS guarantee; each target must be verified by its owner. [Gemini document processing](https://ai.google.dev/gemini-api/docs/document-processing).
- Browser installation/CI workers and deterministic clock fixtures follow [Playwright CI](https://playwright.dev/docs/ci) and [Vitest dates](https://v3.vitest.dev/guide/mocking.html#dates).

KB-MCP was consulted with bounded relevant searches. Retrieved material concerned other IDP/KB projects and did not establish this repository's production acceptance. No credentials or lessons were written back to KB.

## External acceptance still required

1. Read-only public checks on 2026-09-08 found `origin/main` at `90090be0c123c9044bbe3e8b2dc16f6b358672b5`. Actions run [34188671876](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34188671876) passed the remote browser/PWA/stress/interruption gate, and Pages deployment `6320937240` published that SHA. The live origin returned HTTP 200 and exposed the current wizard/update UI. Branch protection and Pages environment settings were not changed.
2. From that Pages origin, use end-user BYOK and a user-selected spend limit to exercise OpenAI canonical images, Gemini native PDF/images, and the intended Custom endpoint. Record model ID, request mode, CORS/network result, schema result, redacted evidence, usage and provider billing reconciliation. Do not attach keys or unredacted HAR files.
3. Validate installation, subpath scope, offline browsing and explicit update on the target devices, including actual Safari or Linux WebKit, if those target-device claims are required for release. Remote Chromium/Firefox/WebKit CI and the live update prompt are recorded, but they do not replace an authorized target-device check.
4. Record any remaining real-document limits and failure/recovery evidence. Do not infer actual provider accuracy, spend or network reachability from mocked CI.

No production GO is claimed while the live-provider/CORS and any required target-device gates remain unverified.
