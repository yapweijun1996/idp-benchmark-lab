# Local Storage & Persistence

## IndexedDB stores

Implemented in `src/storage/db.ts`:
- documents
- extractionProfiles
- goldenAnswers
- providerConfigs
- pricingSnapshots
- benchmarkSuites
- benchmarkRuns
- appSettings

The current database is version 1 and declares these stores directly; no upgrade/migration handler exists yet. Storage-shape changes for remediation require a tested forward migration (TASK-061/068).

## API keys

Required: never in IndexedDB. The dedicated key store defaults to memory, but custom auth headers currently persist inside provider settings (TASK-058). Removing a provider or clearing local data also does not immediately clear all corresponding memory/session credentials. Backups/results are not yet guaranteed secret-free.

## PDF blobs

Default session-only; optional user-selected persistence in IndexedDB. Show document size before persistent storage.

## Backups

Include format version, app version, entities, and hashes. Exclude secrets.

Current import validation checks the envelope, string IDs and top-level secret-like fields. It does not validate complete records or their relationships; an ID-only malformed record can replace valid data. Full pre-write validation and nested secret handling remain open (TASK-058/062). A transaction prevents partial writes on failure, but does not make accepted malformed data valid.

## Recovery

Persist each completed run. Interrupted-suite recovery was not validated by the review and must not be advertised as implemented. TASK-068 includes restart/interruption acceptance. Future resume support is optional and must be explicit.

The Storage → Clear local data action removes user-created documents, templates,
Golden Answers, provider connections, and benchmark history, then restores the
bundled demo documents, extraction templates, and Expected Results. Provider
connections are not restored; users configure a provider and enter its API key at
runtime when they want to run a benchmark.
