# SECURITY — Static BYOK PWA

## Current implementation gaps

**Production NO-GO (2026-09-08).** The dedicated API-key store is memory-only by default with optional tab storage. However, custom authentication headers are persisted in provider settings and copied into backups; the import guard checks only top-level field names. Provider raw/parsed responses and errors are not credential-redacted before storage. Removing a provider or clearing local data does not immediately clear every corresponding in-memory/session key. Synthetic credential probes reproduced persistence/export paths; no real leak was observed.

The policies below remain requirements, not guarantees of the current build. TASK-058 owns credential isolation, cleanup, redaction, and user-facing privacy claims; TASK-062 owns complete backup validation. Until verified, use restricted test credentials and non-sensitive data, avoid putting secrets in custom headers, and treat existing backups/results as potentially secret-bearing. See the [review](docs/reviews/2026-09-08-production-readiness.md).

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
