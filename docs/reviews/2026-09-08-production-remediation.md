# Production remediation evidence — 2026-09-08

## Decision and scope

**NO-GO for production; local remediation, PWA/i18n, and Gateway Demo integration pass local and remote checks, while a full live-provider contract remains open.** The current published checkpoint is `7a8d6e3`; its Actions run [34204734351](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34204734351) passed the complete gate, and Pages deployment `6323749093` is successful at `https://yapweijun1996.github.io/idp-benchmark-lab/`. A controlled demo session and connection request were made only through the user's gateway; no gateway or provider key was sent from the browser.

The initial review at `26b0ae9` remains historical evidence. The published remediation series through `a45980c` includes the WebKit test fix, Actions runtime refresh, current model suggestions and synchronized evidence. This follow-up adds a build-information boundary, versioned update prompt, sub-path-safe entry-point icons, PWA policy tests, five-locale UI coverage, and the bounded Gateway Demo adapter. Node 25.2.1, npm 11.6.2, Vitest 3.2.7 and Playwright 1.62.1 were used on Windows. Each build records its committed SHA in the run identity; the Pages deployment and remote gate identify the published revision.

## Remediated behavior

| Tasks | Change and regression evidence |
| --- | --- |
| 058 | All custom headers are ephemeral; recursive persistence/export redaction covers nested, serialized and malformed credential fields, known echoes, errors and URL credentials. Provider/data deletion clears credentials. In-flight redaction survives clearing. See `src/providers/redaction.test.ts` and `src/benchmarks/production.test.ts`. |
| 059–060 | Every attempt checks Stop and reserves a contract maximum after asynchronous preparation. Unknown billing retains the full reservation; concurrency and retry backoff cannot bypass the ledger. Missing bounds reject hard-cap execution before a request. Six ledger tests and runner regressions cover zero, unknown, variable costs, concurrent reservations and Stop. |
| 061, 064 | Suites freeze PDF bytes, canonical image bytes rendered once, effective prompt/schema, profile/Golden versions, endpoint/settings, pricing and build identity. Historical results read snapshots. Version-2 migration retains records, redacts old credentials and converts legacy PDF Blobs into portable buffers. Tests mutate/delete source records, migrate actual binary data, and round-trip backups. |
| 062–063 | Whole-backup entity/hash/reference/credential validation occurs before writes. Merge also validates the retained graph within the transaction. Malformed provider responses preserve envelopes, usage, latency and parse_error. Retry attempts and durable dispatch intent are retained. No request is automatically replayed after interruption. |
| 065 | Strict and normalized exact/leaf/row metrics and policy persist/display/export separately. Exact/schema rates use terminal runs; error rate includes cancelled/parse/provider failures over requested runs. Unknown totals remain unknown while known retry subtotals remain visible. |
| 066–067 | Fixed Date fixtures and asynchronous test teardown; active six-step wizard replaces obsolete Home tests. PR/main CI runs lint, typecheck, unit, build, audit and three browser engines before Pages deployment. fast-uri resolves to 3.1.7 and sharp to 0.35.4 throughout the asset toolchain. |
| 070 | Home guidance uses five runs; all retained suites are queryable and live updates reach inspectors. A regression exposes 25 suites. The canonical registry covers literal UI calls in English, Mandarin, Malay, Japanese, and Vietnamese; data-derived technical values retain the explicit English fallback. The About panel shows the friendly version and full build identity, and the update prompt shows the loaded version while waiting for explicit acceptance. Retired inline-demo code/tests were removed. |

The hard-cap contract depends on an accurate, sourced provider maximum covering all billable input, output and reasoning. A historical average or arbitrary flat estimate is not a safe bound. The browser cannot constrain a provider that violates its billing contract. New suites persist source bytes even if the library upload was session-only; this is disclosed as local run evidence.

## Verification

| Command/check | Result |
| --- | --- |
| `npm run lint` | Pass; two Fast Refresh warnings in the shared `src/i18n.tsx` module, no errors |
| `npm run typecheck` | Pass |
| `npm test` | 60 files, 340 tests passed; no unhandled errors or React act warnings. Gateway Demo session, SSE, batching, reducer, gate, cost and redaction regressions are included. |
| `npm run build` | Pass; 18 PWA precache entries including the PDF worker; main chunk 1,162.92 kB / 351.16 kB gzip remains above the advisory threshold |
| `npm audit --json` and `npm audit --omit=dev --json` | Zero advisories |
| `npm run test:e2e` | 55 passed, 2 skipped (non-Chromium update probes); 57 cases across Chromium, Firefox and WebKit, about 2.4 minutes |
| GitHub Actions [34204734351](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34204734351) | Complete required gate passed for `7a8d6e3`: lint, typecheck, unit tests, build, audit, Chromium/Firefox/WebKit browser acceptance and evidence upload |
| GitHub Pages deployment `6323749093` | Published checkpoint `7a8d6e3`; status success; public origin returned HTTP 200 and the current six-step wizard/update UI |
| `git diff --check` | Pass |

Browser checks use synthetic credentials and intercepted provider responses. They traverse the wizard, retain real PDF/image payloads, exercise malformed output, cap refusal and Stop, run 100 requests at concurrency 10, restore/export/reload, and recover interruption without replay. A synthetic 100-page PDF tests page discovery and bounded lazy preview; it is not a claim about worst-case scanned-document throughput. Phone/tablet viewport navigation, all five locale selections and the current version in the explicit update prompt are included. Local Chromium update testing changes/restores only generated `dist/sw.js`; Firefox/WebKit update copies are intentionally skipped to keep one writer.

After the final pre-dispatch error-classification correction, the focused hard-budget/Stop Playwright subset passed 6/6 across Chromium, Firefox and WebKit.

The initial concurrent browser matrix had Firefox initialization and WebKit stress navigation timeouts. Browser tests now use one worker (including locally), actual sidebar navigation after reload and a scoped 120-second allowance for the 100-run restore test. Failures were retained while investigating, rather than relabelled as application passes.

Windows WebKit automation reload returned `WebKit encountered an internal error` after a service worker was ready and controlling the page. A minimal standalone HTML + cache-only service worker reproduced the same failure without application code. Playwright's page-initiated `location.reload()` path avoids the affected automation reload path; `9bbf744` applies that driver only to the offline assertion. The earlier corrected baseline was 52 passed and 2 skipped; the current Gateway Demo matrix is 55 passed and 2 skipped. Actual Safari/Linux WebKit still require target-device verification.

## Official contract and pricing research

- OpenAI's documented JSON-object mode does not guarantee schema adherence. The adapter keeps JSON mode and local AJV validation; it does not claim provider-native JSON Schema enforcement. [Structured outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
- Pricing depends on exact model, tier, modality/context and cache treatment. No timeless built-in tariff was added. Users enter a dated source and rates for their selected contract; historical snapshots never reread a new price. [OpenAI pricing](https://developers.openai.com/api/docs/pricing).
- Google's current pricing page lists `gemini-3.5-flash-lite` at USD 0.30 input, 2.50 output and 0.03 cached input per million tokens for the paid Standard tier, with thinking included in output billing; `gemini-3.1-flash-lite` is also listed with a separate current rate. These are research evidence, not app defaults or an execution upper bound. Gemini usage normalization includes reported thought tokens. [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [GenerateContent usage metadata](https://ai.google.dev/api/generate-content).
- Gemini native PDF requests follow its inline document input shape. Custom OpenAI-compatible services have no universal contract or CORS guarantee; each target must be verified by its owner. [Gemini document processing](https://ai.google.dev/gemini-api/docs/document-processing).
- Browser installation/CI workers and deterministic clock fixtures follow [Playwright CI](https://playwright.dev/docs/ci) and [Vitest dates](https://v3.vitest.dev/guide/mocking.html#dates).

KB-MCP was consulted with bounded relevant searches. Retrieved material concerned other IDP/KB projects and did not establish this repository's production acceptance. No credentials or lessons were written back to KB.

## External acceptance still required

1. Public checks on 2026-09-08 recorded the published checkpoint `7a8d6e3`. Actions run [34204734351](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34204734351) passed the remote browser/PWA/stress/interruption gate, and Pages deployment `6323749093` published that checkpoint. The live origin returned HTTP 200 and exposed the current wizard/update UI. `origin/main` matches the published commit; branch protection and Pages environment settings were not changed.
2. The pre-remediation Chromium spike that returned `DEMO_MEDIA_DISABLED` for a 1×1 PNG is historical and is superseded by the contract recheck below. The current route accepts bounded canonical images; the remaining acceptance work is a real document, quota/usage/cost reconciliation, and any required target-device evidence. No token or unredacted HAR was retained.
3. Validate installation, subpath scope, offline browsing and explicit update on the target devices, including actual Safari or Linux WebKit, if those target-device claims are required for release. Remote Chromium/Firefox/WebKit CI, the public manifest/service-worker probe, and the live update prompt are recorded, but they do not replace an authorized target-device check.
4. Record any remaining real-document limits and failure/recovery evidence. Do not infer actual provider accuracy, spend or network reachability from mocked CI.

No production GO is claimed while the real-document, quota/billing, and any required target-device gates remain unverified.

## Gateway Demo contract recheck (2026-09-08)

The earlier `DEMO_MEDIA_DISABLED` observation above is historical. A subsequent
Pages-origin spike against the user's demo gateway verified the updated bounded
multimodal route:

| Probe | Result |
| --- | --- |
| `POST https://gpt.yapweijun1996.com/demo/session` with `project_id: github-pages` | `201`; response token matched the short-lived `dmo_` shape (token value not retained) |
| `GET /demo/v1/models` | `200`; `demo-fast` advertised Responses, streaming, multimodal, and structured-output capabilities |
| `OPTIONS /demo/v1/responses` from `https://yapweijun1996.github.io` | `204`; exact `Access-Control-Allow-Origin` matched the Pages origin |
| one 1×1 PNG `input_image`, non-streaming Responses | `200` JSON with usage |
| four 1×1 PNGs, `stream:true` Responses | `200` SSE with Responses completion events and usage |
| five 1×1 PNGs in one request | `400` `DEMO_IMAGE_COUNT_EXCEEDED` |

The frontend now adds a `gateway_demo` profile to the existing OpenAI-compatible
adapter. It obtains the session in the browser, keeps the token in the memory
credential store, forces canonical images and Responses, packs at most four images
per request, and sends larger documents through sequential map calls and a text-only
model reducer. Each child call receives the existing Stop and hard-budget gate and
contributes usage, timing, cost basis, provider-call count, and redacted attempt
evidence. A later child failure is retained as partial evidence and is not
automatically replayed.

The latest guide also documents optional Turnstile on session creation and server-side
`demo-fast` routing across healthy providers. The current registered Pages project does
not require Turnstile; the adapter accepts a runtime challenge token when a future browser
integration supplies one, and keeps the gateway's route/quota result as provider evidence.

A real-browser run of the un-deployed branch from `http://127.0.0.1:5173` received
`403` from `/demo/session` because that development Origin is not registered by the
gateway. The UI kept the session in the missing-key state and the browser had no
`dmo_` value in `sessionStorage`. This confirms the Origin gate and prevents treating a
local CORS/session rejection as a provider or extraction failure; the full browser
map/reduce check must run from the registered Pages Origin (or after the gateway owner
registers a development Origin).

A Chromium run against the published Pages origin exercised the deployed Gateway Demo
path with a synthetic five-page PDF. The browser received session `201`, then three
Responses SSE calls with status `200` and usage: map batches containing 4 and 1 images
followed by one text-only reducer call. The Quick Test completed and no `dmo_`, `gw_`,
or `sk_` value appeared in `sessionStorage`. A separate public PWA probe found the
manifest (`start_url`/`scope` `./`, standalone display, three icons), an activated
service worker controlling the page after reload, one Workbox app-shell cache, and
the About `Version v0.1.0` text. This proves the published wiring and app-shell
contract for synthetic input; it is not a real-document or billing result.

The first-run provider initialization is covered by unit tests: an empty browser
profile receives one keyless Gateway Demo configuration, the wizard can select it
immediately, and a deliberate removal is preserved. Connecting the short-lived
session remains an explicit Settings action.

The current branch has local unit/UI coverage for session validation, four/five-page
packing, SSE parsing, reducer invocation, partial-failure redaction, and memory-only
session persistence. TASK-068 remains **NO-GO** until a real four-page PDF, quota and
billing reconciliation, and any required target-device storage/cache evidence are
recorded; the five-page synthetic map/reduce, remote Actions/Pages revision, and CI
browser matrix are now proven.
