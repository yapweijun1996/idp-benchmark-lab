# PROJECT_STATUS — IDP Benchmark Lab

## Decision

**NO-GO for production; local remediation and the WebKit acceptance fix are committed.** The remaining gates require a passing remote browser matrix, a deployed Pages revision, real browser BYOK/provider/CORS evidence and confirmation of WebKit/Safari offline behavior. The user pushed `8b532e4`; the local follow-up series contains the tested WebKit fix, refreshed Actions runtime versions, current Gemini model suggestions and synchronized evidence. The follow-up series is not yet pushed. No deployment or paid request was made.

The app remains a static Pages/PWA with direct provider adapters and no server. Home → New Benchmark is the active six-step flow. Dedicated keys and custom headers are ephemeral; suite evidence freezes effective inputs, versions, pricing and build identity. Strict/normalized metrics remain separate. All retained history is visible; translation fallback remains explicit.

Read-only external check on 2026-09-08: `origin/main` is `8b532e42c1577ce7c0d102c274a013d490d05348`. Actions run [34185343749](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34185343749) passed lint, typecheck, unit tests, build and dependency audit, then failed at Browser acceptance on the old WebKit offline reload path; Pages setup and deploy were skipped. The local follow-up `9bbf744` changes that test to a page-initiated reload and the full matrix now passes locally. The public Pages URL still returns the last successful pre-remediation revision and is not evidence for the follow-up until its CI run succeeds.

## Local verification

- Lint and typecheck pass; lint retains two pre-existing Fast Refresh warnings.
- Unit/integration: 55 files, 312 tests pass with no unhandled errors or React act warnings.
- Build passes with 18 app-shell precache entries; bundle-size warning remains.
- Full and production-only dependency audits report zero advisories.
- Final serial browser matrix: 46 passed, 2 skipped (non-Chromium update probes). All three engines passed wizard, PWA offline shell, stress, backup, interruption, large-page-count preview and bounded responsive navigation.

Detailed changes, exact limitations, official sources and the user-push acceptance checklist are in the [remediation report](docs/reviews/2026-09-08-production-remediation.md). The [original review](docs/reviews/2026-09-08-production-readiness.md) remains an unchanged historical baseline. [TASK.md](TASK.md) owns task status.

The work is committed on `main`; prior user work was preserved. The local follow-up series awaits the user's push and remote CI rerun. KB-MCP was consulted but returned no repository-specific acceptance evidence. No backend addition or architectural rewrite is needed to complete the external checks.
