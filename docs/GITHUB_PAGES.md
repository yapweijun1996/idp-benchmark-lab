# GitHub Pages Deployment Notes

Goal: push -> CI test/build -> automatic Pages deployment.

Current status: **production NO-GO**. [DEPLOYMENT.md](../DEPLOYMENT.md) describes the workflow; [PROJECT_STATUS.md](../PROJECT_STATUS.md) holds dated verification. The current published checkpoint is `7a8d6e3`; Actions run `34204734351` and Pages deployment `6323749093` passed and published the bounded Gateway Demo image contract. Full real-PDF and quota/billing acceptance remain pending.

The workflow uses the current checked releases: `checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v4`, `upload-artifact@v7`, and `deploy-pages@v5`, with Node 24 pinned. Package resolution comes from `package-lock.json`; the reviewed versions and advisory paths are recorded in [DEPENDENCIES.md](DEPENDENCIES.md).

The deployed static app can use the Gateway Demo browser profile at
`https://gpt.yapweijun1996.com/demo`. The browser obtains an origin-bound
15-minute session and sends `/demo/v1/responses` traffic directly; the app adds no
backend or proxy. The profile batches canonical pages in groups of four and keeps
provider traffic outside the service-worker cache. A live recheck on 2026-09-08
confirmed Pages-origin session `201`, models `200`, Responses preflight `204`,
one-image JSON `200`, four-image streaming `200` with usage, and five-image `400`
`DEMO_IMAGE_COUNT_EXCEEDED`. Full PDF map/reduce, quota and remote CI evidence are
still TASK-068 release gates.

At implementation time, consult current official GitHub Pages documentation and use current supported Pages Actions; do not rely on stale action versions from planning docs.

Typical build flow:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
npm run test:e2e
```

The workflow runs this validation on pull requests and main pushes; deployment is downstream of the complete build job and is excluded from pull requests. The Windows WebKit offline reload limitation, target-device PWA checks, and real Pages/provider document acceptance remain release gates recorded in the remediation report. A documentation status change does not pause automatic deployment.

Artifact: Vite `dist/`.

Check repository base path, SPA routing, service worker scope, manifest/icon URLs (including the relative Pages entry-point icons), cache busting, and source maps. Confirm the generated Workbox service worker has app-shell precache only and no runtime provider/PDF/evidence routes.

No provider key is required in GitHub repository settings for normal operation; BYOK is entered by user in browser.
