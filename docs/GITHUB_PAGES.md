# GitHub Pages Deployment Notes

Goal: push -> CI test/build -> automatic Pages deployment.

Current status: **production NO-GO**. [DEPLOYMENT.md](../DEPLOYMENT.md) describes the workflow; [PROJECT_STATUS.md](../PROJECT_STATUS.md) holds dated verification. The remediation commit is pushed, but Actions run [34184792553](https://github.com/yapweijun1996/idp-benchmark-lab/actions/runs/34184792553) failed Browser acceptance at the reproduced WebKit offline reload error, so Pages still serves the last successful pre-remediation revision. Provider CORS from the deployed origin still requires the user's end-user BYOK checks.

The reviewed workflow uses `checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, and `deploy-pages@v4`, with a floating `lts/*` Node runtime. Package resolution comes from `package-lock.json`; the reviewed versions and advisory paths are recorded in [DEPENDENCIES.md](DEPENDENCIES.md).

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
