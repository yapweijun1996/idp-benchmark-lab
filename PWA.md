# PWA — Offline/Static Behavior

## Verification status

The current build precaches 18 app-shell assets including the PDF worker .mjs, with no provider/PDF/evidence runtime cache. Chromium and Firefox offline saved-PDF browsing and Chromium explicit update/reload passed locally. Windows WebKit offline reload fails with an internal browser error also reproduced by a minimal standalone service worker; Linux CI and actual Safari remain unverified.

## Goal

Application shell and saved benchmark history remain usable offline. Provider extraction requires reachable provider/custom endpoint.

## Cache policy

Cache HTML shell, JS/CSS bundles, icons, and static help assets.

Do not put PDFs, generated page images, API traffic, keys, or benchmark results in Cache Storage.

## IndexedDB may persist

- app settings
- provider config without secret
- profiles/schemas
- Golden Answers
- benchmark results
- optional document blobs after explicit user choice

## Installability

Include manifest, icons, theme/background, standalone display, responsive viewport.

## Update UX

When new build exists, notify user and allow explicit update/reload. Do not destroy an active benchmark without warning.

## Offline UX

Target behavior: an offline user can browse retained local results, edit prompts/schemas/Expected Results, inspect a locally persisted PDF, and export data. Run should be disabled with a clear network message.

Run does not use navigator.onLine as proof of provider reachability; fetch failures are reported as network/CORS ambiguity. Reload/update explicitly warns about active requests and memory credentials. Interrupted work is recovered without replay. Real Pages scope/installability and live-provider offline transitions remain TASK-068 checks.
