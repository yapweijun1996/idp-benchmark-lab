# PROJECT_STATUS — IDP Benchmark Lab

## Decision

**NO-GO for production; local remediation and the PWA/i18n change set pass local checks, while full live-provider evidence is still open.** The last published checkpoint is `a45980c`; its Actions run [34189377220](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34189377220) passed the full lint/typecheck/unit/build/audit/browser gate, and Pages deployment `6321054280` is successful. A controlled Pages-origin demo session and Custom Responses connection test succeeded, but the demo policy is text-only and cannot run the app's image/file/structured-output IDP contract. A provider supporting that contract is still required for schema, usage and billing evidence. The current local change set is pending its own push and remote rerun.

The app remains a static Pages/PWA with direct provider adapters and no server. Home → New Benchmark is the active six-step flow. Dedicated keys and custom headers are ephemeral; suite evidence freezes effective inputs, versions, pricing and build identity. Strict/normalized metrics remain separate. All retained history is visible; the canonical i18n registry covers literal UI calls in English, Mandarin, Malay, Japanese, and Vietnamese, with explicit English fallback for data-derived technical values. The update prompt shows the loaded friendly version and waits for explicit acceptance; About exposes the full build identity.

Read-only external check on 2026-09-08 recorded the published acceptance series through `a45980c` (the deployment metadata retains the earlier `dc2ddc527097aafe5625da2d4e10ab273ee8217b` checkpoint). Actions run [34189377220](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34189377220) passed all required checks, including Chromium, Firefox and WebKit browser acceptance, and Pages deployment [6321054280](https://github.com/yapweijun1996/idp-benchmark-lab/deployments) reports success at `https://yapweijun1996.github.io/idp-benchmark-lab/`. The live origin returns HTTP 200 and the current wizard/update UI. A browser spike from that Pages origin obtained `/demo/session` with 201, passed `OPTIONS /demo/v1/responses` with 204 and an exact `Access-Control-Allow-Origin`, and received a 200 JSON text Responses result with usage. The same 1×1 PNG sent as `input_image` to Responses and as `image_url` to Chat Completions returned JSON 400 `DEMO_MEDIA_DISABLED` (text-only). The demo's text-only contract prevents a full IDP run.

## Local verification

- Lint and typecheck pass; lint retains two Fast Refresh warnings for the shared i18n module (no errors).
- Unit/integration: 59 files, 322 tests pass with no unhandled errors or React act warnings.
- Build passes with 18 app-shell precache entries; the 1,125.88 kB main chunk / 341.34 kB gzip bundle-size warning remains.
- Full and production-only dependency audits report zero advisories.
- Final serial browser matrix: 49 passed, 2 skipped (non-Chromium update probes) across Chromium, Firefox, and WebKit. All three engines passed the active wizard, five-locale shell switching, PWA offline shell, explicit versioned update (Chromium), stress, backup, interruption, large-page-count preview and bounded responsive navigation.

Detailed changes, exact limitations, official sources and the user-push acceptance checklist are in the [remediation report](docs/reviews/2026-09-08-production-remediation.md). The [original review](docs/reviews/2026-09-08-production-readiness.md) remains an unchanged historical baseline. [TASK.md](TASK.md) owns task status.

The last published checkpoint matches `origin/main`; this local PWA/i18n change set is committed separately and requires a push before remote evidence can be updated. KB-MCP was consulted but returned no repository-specific acceptance evidence. No backend addition or architectural rewrite is needed; only a provider contract that supports the full IDP request remains before a production GO decision.
