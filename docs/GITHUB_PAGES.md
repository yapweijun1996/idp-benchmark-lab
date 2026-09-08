# GitHub Pages Deployment Notes

Goal: push -> CI test/build -> automatic Pages deployment.

Current status: **production NO-GO**. [DEPLOYMENT.md](../DEPLOYMENT.md) describes the workflow; [PROJECT_STATUS.md](../PROJECT_STATUS.md) holds dated verification. Follow-up `9bbf744` fixes the WebKit offline acceptance driver after Actions run [34185343749](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34185343749) failed the old path, and `ddbec9e` refreshes the Actions runtime versions; these commits must be pushed before Pages can rerun. Provider CORS from the deployed origin still requires the user's end-user BYOK checks.

The workflow uses the current checked releases: `checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v4`, `upload-artifact@v7`, and `deploy-pages@v5`, with Node 24 pinned. Package resolution comes from `package-lock.json`; the reviewed versions and advisory paths are recorded in [DEPENDENCIES.md](DEPENDENCIES.md).

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

The workflow runs this validation on pull requests and main pushes; deployment is downstream of the complete build job and is excluded from pull requests. The local Windows WebKit offline reload limitation and live Pages/provider acceptance remain release blockers recorded in the remediation report. A documentation status change does not pause automatic deployment.

Artifact: Vite `dist/`.

Check repository base path, SPA routing, service worker scope, manifest/icon URLs, cache busting, and source maps.

No provider key is required in GitHub repository settings for normal operation; BYOK is entered by user in browser.
