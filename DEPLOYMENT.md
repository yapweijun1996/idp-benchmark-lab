# DEPLOYMENT — GitHub Pages

## Target

Static auto-deploy from GitHub Actions to GitHub Pages.

## Requirements

- no secrets required for build
- no provider keys in GitHub Actions
- correct Vite repository base path
- Pages-compatible SPA routing

Prefer hash routing or another Pages-safe routing strategy for the spike.

## Repository prerequisites (required BEFORE the first deploy)

The deploy workflow itself is correct; a "configure-pages / Not Found" failure
means the repository has not enabled Pages for GitHub Actions yet:

1. Repository → **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions** (not
   "Deploy from a branch").
3. Confirm the environment `github-pages` exists (GitHub creates it on the
   first successful `deploy-pages` run; it cannot be created manually).
4. The default branch must be the one the workflow listens on (`main`).

If Pages was previously configured with the legacy branch source, switch the
Source to GitHub Actions; otherwise the workflow's `environment: github-pages`
reference fails with the Not Found error.

## Workflow intent

On push to configured branch:

1. checkout
2. install from lockfile
3. lint
4. typecheck
5. test
6. build
7. upload Pages artifact
8. deploy Pages

At implementation time, use current official GitHub Pages Actions/versions. If a newer major of a Pages action is unavailable on your account/enterprise runner images, pin the known-good major (the workflow currently uses the v3/v4/v5 line); the failure mode of "missing" newer actions is a workflow-syntax-level error, not a Pages misconfiguration.

## Environment

Build-time environment contains public config only. BYOK happens in browser after load.

## Acceptance

- Pages URL loads
- refresh works with chosen routing
- service worker registers
- manifest/icons resolve
- assets use correct base path
- build/source maps contain no secret

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `configure-pages` / `deploy-pages` Not Found or skipped | Pages not enabled, or Source not set to GitHub Actions | Set Settings → Pages → Source = GitHub Actions (see prerequisites above) |
| Deploy fails with `environment 'github-pages'` error | First deploy has not run yet | Trigger `workflow_dispatch` once; GitHub creates the environment |
| 404 on refresh of a sub-path | Router needs history fallback | The app uses hash routing (`#/...`), so refresh paths never leave the shell |
| Assets 404 under a project sub-path | Wrong Vite base | `vite.config.ts` uses `base: "./"` (relative), which works at any sub-path |
