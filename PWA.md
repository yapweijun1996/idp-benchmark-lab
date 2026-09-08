# PWA — Offline/Static Behavior

## Verification status

The current build precaches 18 app-shell assets including the PDF worker `.mjs`, with `runtimeCaching: []`. Provider traffic (including Gateway Demo map/reducer requests), PDFs, generated images, credentials, and benchmark evidence never enter Cache Storage. The local three-engine matrix covers 57 cases: 55 passed and 2 update probes skipped outside Chromium because the probe has one generated service-worker writer. Windows WebKit's automation reload limitation remains documented; the page-initiated reload path passes, while actual Safari/Linux WebKit still require target-device evidence.

## Goal

Application shell and saved benchmark history remain usable offline. Provider extraction requires reachable provider/custom endpoint.

## Cache policy

Precache HTML shell, JS/CSS bundles, icons, and static help assets.

Do not put PDFs, generated page images, API traffic, keys, or benchmark results in Cache Storage. The Workbox allowlist is `**/*.{js,mjs,css,html,svg,png,ico,woff2}` and has no runtime routes.

## IndexedDB may persist

- app settings
- provider config without secret
- profiles/schemas
- Golden Answers
- benchmark results
- optional document blobs after explicit user choice

## Installability

Include manifest `id`, icons, theme/background, standalone display, relative `start_url`/scope, and a responsive viewport. Pages entry-point icons use relative URLs so the PWA remains installable below a repository sub-path.

## Update UX

When a new build exists, notify the user and allow explicit update/reload. The prompt shows the currently loaded friendly package version (for example, `v0.1.0`) in its status and button, while the About panel exposes the full version/revision/build identity. The prompt uses the service worker's `onNeedRefresh` event to clear a previous dismissal, keeps the active-benchmark and memory-credential warning, and never reloads automatically. The service-worker API does not provide a target version, so the UI never labels the current version as the incoming one.

## Offline UX

Target behavior: an offline user can browse retained local results, edit prompts/schemas/Expected Results, inspect a locally persisted PDF, and export data. Run should be disabled with a clear network message.

Run does not use navigator.onLine as proof of provider reachability; fetch failures are reported as network/CORS ambiguity. Reload/update explicitly warns about active requests and memory credentials. Interrupted work is recovered without replay. Real Pages scope/installability, target-device update behavior, and live-provider offline transitions remain TASK-068 checks.

## Localized UI

The five supported locales are English, Mandarin, Malay, Japanese, and Vietnamese. `useI18n().t()` remains the application contract. `I18N_KEY_REGISTRY` is built from the canonical shell and page copy tables; a coverage test scans literal translation calls and verifies every registered key has a value in each locale. Provider/model names, file names, hashes, and other data-derived technical values intentionally use the English source fallback.
