# PROJECT_STATUS — IDP Benchmark Lab

## Decision

**NO-GO for production; local remediation implemented and committed.** The remaining gates require a passing browser matrix, a deployed Pages revision, real browser BYOK/provider/CORS evidence and confirmation of WebKit/Safari offline behavior. The user pushed commit `c4e8abe2afbba91f27de532c63d05fe7f13b2593` for testing; no deployment or paid request was made.

The app remains a static Pages/PWA with direct provider adapters and no server. Home → New Benchmark is the active six-step flow. Dedicated keys and custom headers are ephemeral; suite evidence freezes effective inputs, versions, pricing and build identity. Strict/normalized metrics remain separate. All retained history is visible; translation fallback remains explicit.

Read-only external check on 2026-09-08: `origin/main` is `c4e8abe2afbba91f27de532c63d05fe7f13b2593`. Actions run [34184792553](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34184792553) passed lint, typecheck, unit tests, build and dependency audit, then failed at Browser acceptance on the reproduced WebKit offline reload error; Pages setup and deploy were skipped. The public Pages URL still returns the last successful pre-remediation revision and is not evidence for this patch.

## Local verification

- Lint and typecheck pass; lint retains two pre-existing Fast Refresh warnings.
- Unit/integration: 55 files, 312 tests pass with no unhandled errors or React act warnings.
- Build passes with 18 app-shell precache entries; bundle-size warning remains.
- Full and production-only dependency audits report zero advisories.
- Final serial browser matrix: 45 passed, 1 failed (Windows WebKit offline reload), 2 skipped (non-Chromium update probes). All three engines passed wizard, stress, backup, interruption, large-page-count preview and bounded responsive navigation.

Detailed changes, exact limitations, official sources and the user-push acceptance checklist are in the [remediation report](docs/reviews/2026-09-08-production-remediation.md). The [original review](docs/reviews/2026-09-08-production-readiness.md) remains an unchanged historical baseline. [TASK.md](TASK.md) owns task status.

The work is committed on `main`; prior user work was preserved. KB-MCP was consulted but returned no repository-specific acceptance evidence. No backend addition or architectural rewrite is needed to complete the external checks.
