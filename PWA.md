# PWA — Offline/Static Behavior

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

Offline user can browse results, edit prompts/schemas/golden answers, inspect locally persisted PDF, and export data. Disable Run with clear provider/network message.
