# GitHub Pages Deployment Notes

Goal: push -> CI test/build -> automatic Pages deployment.

Current status: **production NO-GO**. [DEPLOYMENT.md](../DEPLOYMENT.md) describes the workflow; [PROJECT_STATUS.md](../PROJECT_STATUS.md) holds dated verification. The last published checkpoint is `a45980c`; its remote Actions/Pages evidence is retained in the remediation report. The PWA/i18n code commit `57458d7` is on `origin/main`; wait for its Actions/Pages rerun before relying on new remote evidence. The demo origin's CORS preflight and text Responses path pass, but a full image/PDF plus JSON provider contract from the deployed origin still requires the user's end-user BYOK checks.

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

The workflow runs this validation on pull requests and main pushes; deployment is downstream of the complete build job and is excluded from pull requests. The Windows WebKit offline reload limitation and live Pages/provider acceptance remain release blockers recorded in the remediation report. A documentation status change does not pause automatic deployment.

Artifact: Vite `dist/`.

Check repository base path, SPA routing, service worker scope, manifest/icon URLs (including the relative Pages entry-point icons), cache busting, and source maps. Confirm the generated Workbox service worker has app-shell precache only and no runtime provider/PDF/evidence routes.

No provider key is required in GitHub repository settings for normal operation; BYOK is entered by user in browser.
