# BYOK Security Details

## Implementation status

The policies below are requirements. Current custom auth headers can bypass the dedicated memory-only key store and persist inside provider settings/backups. Raw/parsed responses and errors also lack credential redaction, and deleting provider/local data does not immediately clear every ephemeral key. TASK-058/062 track these verified gaps; see [SECURITY.md](../SECURITY.md) and the [review](reviews/2026-09-08-production-readiness.md). Do not treat current backups as secret-free.

## Model

No backend means user credential is used directly in browser. This is appropriate for a demo/testing tool when the user understands the key exists in browser memory.

## UI

API key field:
- password input
- reveal button
- optional "Remember for this tab"
- no permanent remember in MVP

On reload, clear unless session-only mode was explicitly chosen.

## Redaction

Before persistence/debugging/export remove Authorization, apiKey, x-api-key, and provider-specific secret fields.

## Browser developer tools

The app cannot prevent the user from seeing their own request/key in devtools. Do not claim server-secured secrecy.

## Public repository

Safe only if no secret is committed and build/sample config contains placeholders.
