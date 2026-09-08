# PWA — Offline/Static Behavior

## Verification status

This document states the intended cache/offline/update behavior. The 2026-09-08 build generated a manifest and service worker with 17 app-shell precache entries and no runtime-cache routes. The review did not verify the complete browser offline/update lifecycle or interruption safety. Those remain TASK-068 acceptance work; see [PROJECT_STATUS.md](PROJECT_STATUS.md). Secret-free provider settings/results also require TASK-058 before that guarantee can be made.

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

Current behavior does not proactively gate Run with `navigator.onLine`; a failed request is normalized as a network/CORS ambiguity. Offline browsing, update/reload during an active run, service-worker scope, and retained data behavior still require browser acceptance under TASK-068.
