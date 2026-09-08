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

Database version 2 upgrades version 1 transactionally, retaining records, sanitizing credentials, converting legacy PDF Blobs to binary buffers and marking missing historical snapshots. Migration regressions include actual binary preservation.

## API keys

Keys and custom headers never enter IndexedDB. Provider removal and local-data clearing also clear associated memory/session credentials. Backup restore clears credentials after commit.

## PDF blobs

Default library storage is session-only; explicit persistence stores PDF ArrayBuffer bytes and reconstructs Blobs on read for browser compatibility. Starting a benchmark freezes the source PDF and canonical images into its persistent suite evidence, even when the library document was session-only.

## Backups

Include format version, app version, entities, and hashes. Exclude secrets.

Full backups validate record shapes, IDs, references, dates, hashes, binary payloads, snapshot versions and recursive credential absence before mutation. Replace is atomic; merge additionally validates the complete resulting graph while holding the write transaction. Invalid backups do not clear existing data.

## Recovery

Persist dispatch intent before calling the provider, then each attempt result and terminal run. A browser execution lock prevents recovery from cancelling another tab's live suite. Reload recovery marks abandoned work interrupted, retains evidence, reports unknown possible billing and never resubmits. History queries subscribe to changes.

The Storage → Clear local data action removes user-created documents, templates,
Golden Answers, provider connections, and benchmark history, then restores the
bundled demo documents, extraction templates, and Expected Results. Provider
connections are not restored; users configure a provider and enter its API key at
runtime when they want to run a benchmark.
