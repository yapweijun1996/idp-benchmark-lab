# GitHub Pages Deployment Notes

Goal: push -> CI test/build -> automatic Pages deployment.

At implementation time, consult current official GitHub Pages documentation and use current supported Pages Actions; do not rely on stale action versions from planning docs.

Typical build flow:

```text
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Artifact: Vite `dist/`.

Check repository base path, SPA routing, service worker scope, manifest/icon URLs, cache busting, and source maps.

No provider key is required in GitHub repository settings for normal operation; BYOK is entered by user in browser.
