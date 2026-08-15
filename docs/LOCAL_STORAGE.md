# Local Storage & Persistence

## IndexedDB stores

Recommended:
- documents
- extractionProfiles
- goldenAnswers
- providerConfigs
- pricingSnapshots
- benchmarkSuites
- benchmarkRuns
- appSettings

## API keys

Never in IndexedDB.

## PDF blobs

Default session-only; optional user-selected persistence in IndexedDB. Show document size before persistent storage.

## Backups

Include format version, app version, entities, and hashes. Exclude secrets.

## Recovery

Persist each completed run. MVP may mark an interrupted running suite as `stopped` after reload; future resume support is optional and must be explicit.
