# GitHub Pages Deployment Notes

Goal: push -> CI test/build -> automatic Pages deployment.

Current status: **production NO-GO**. [DEPLOYMENT.md](../DEPLOYMENT.md) describes the actual workflow and missing PR/browser gates; [PROJECT_STATUS.md](../PROJECT_STATUS.md) holds dated verification. The deployed site/revision and provider CORS from its origin were not checked in the review.

The reviewed workflow uses `checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, and `deploy-pages@v4`, with a floating `lts/*` Node runtime. Package resolution comes from `package-lock.json`; the reviewed versions and advisory paths are recorded in [DEPENDENCIES.md](DEPENDENCIES.md).

At implementation time, consult current official GitHub Pages documentation and use current supported Pages Actions; do not rely on stale action versions from planning docs.

Typical build flow:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

This is the existing workflow's validation sequence. The current date-sensitive unit failure prevents that sequence from reaching deploy. `npm run test:e2e` after build is also required for release acceptance, but is not currently in the workflow (TASK-066). A documentation status change does not pause automatic deployment.

Artifact: Vite `dist/`.

Check repository base path, SPA routing, service worker scope, manifest/icon URLs, cache busting, and source maps.

No provider key is required in GitHub repository settings for normal operation; BYOK is entered by user in browser.
