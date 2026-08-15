# DEPLOYMENT — GitHub Pages

## Target

Static auto-deploy from GitHub Actions to GitHub Pages.

## Requirements

- no secrets required for build
- no provider keys in GitHub Actions
- correct Vite repository base path
- Pages-compatible SPA routing

Prefer hash routing or another Pages-safe routing strategy for the spike.

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

At implementation time, use current official GitHub Pages Actions/versions.

## Environment

Build-time environment contains public config only. BYOK happens in browser after load.

## Acceptance

- Pages URL loads
- refresh works with chosen routing
- service worker registers
- manifest/icons resolve
- assets use correct base path
- build/source maps contain no secret
