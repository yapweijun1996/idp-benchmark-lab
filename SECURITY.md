# SECURITY — Static BYOK PWA

## Current implementation boundary

Known keys and custom-header values are registered for recursive redaction before persistence/export. All custom headers are memory-only; credentials are cleared on provider deletion or local-data clearing. In-flight requests retain a private redaction context after clearing. The version-2 migration removes legacy credential fields and known echoes while preserving historical records.

Synthetic regression tests cover nested/serialized/malformed credential fields, URL credentials, echoed responses/errors, deletion and backup import rejection. This is a browser BYOK boundary, not a guarantee against arbitrary transformations of secrets by a hostile provider. Previously downloaded backups cannot be repaired by an app migration. Production acceptance still requires the external checks in [PROJECT_STATUS.md](PROJECT_STATUS.md).

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
