# SECURITY — Static BYOK PWA

## Threat model

Public/static browser application. It cannot hide API keys from the user's own browser runtime.

Security goals:
- never commit keys
- never send keys to an app-owned backend
- minimize persistence
- avoid logs/caches/exports
- make BYOK risk explicit

## API keys

Default: memory only; clear on reload/tab close.

Optional: sessionStorage only after explicit opt-in.

Do not store keys in Git, source, committed `.env`, localStorage, IndexedDB, service-worker cache, benchmark records, exports, analytics, or console logs.

## Required warning

> This static PWA sends requests directly from your browser to the selected provider. Your BYOK API key is available to your browser runtime. Use a limited/test key where possible and do not use a high-privilege production key for this demo.

## Document privacy

PDF stays local until Run. When Run starts, selected PDF/images are intentionally sent to the active provider. Show provider before sending.

## CORS

Never route through an untrusted proxy. If provider/custom endpoint blocks browser access, fail clearly and explain.

## Logging/redaction

Never log Authorization/api-key headers. Raw provider responses may contain document data and stay local.

## Service worker

Cache static app assets only, never provider traffic, keys, PDFs, benchmark JSON, or raw results.

## Exports

Strip secrets and auth headers. Mark document/result data as potentially sensitive.

## Dependencies

Use lockfile and dependency alerts. Avoid unnecessary packages with broad browser privileges.
