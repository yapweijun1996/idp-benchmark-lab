# Dependencies and Toolchain

## Source of truth

`package.json` declares supported ranges and `package-lock.json` (lockfile version 3) pins the installed dependency graph. This document is a dated summary for review, not a replacement for either file.

Remediation checked 2026-09-08 on top of `86ed35f`; see the remediation report for final command evidence.

## Runtime dependencies

| Package | Resolved version | Responsibility |
| --- | --- | --- |
| `react` / `react-dom` | 19.2.8 | SPA UI |
| `dexie` | 4.4.5 | IndexedDB access |
| `pdfjs-dist` | 6.2.108 | Local PDF preview and canonical page rendering |
| `ajv` | 8.20.0 | Canonical JSON Schema validation |

Provider calls use browser `fetch`; there is no provider SDK or required backend.

## Build and verification toolchain

| Package | Resolved version | Responsibility |
| --- | --- | --- |
| `typescript` | 6.0.3 | Strict type checking |
| `vite` / `@vitejs/plugin-react` | 8.2.1 / 6.0.5 | Production build and local preview |
| `vite-plugin-pwa` | 1.3.0 | Manifest and service-worker generation |
| `vitest` | 3.2.7 | Unit/integration tests |
| `@playwright/test` | 1.62.1 | Chromium browser tests |
| `eslint` / `typescript-eslint` | 9.39.5 / 8.67.0 | Static linting |
| `sharp` | 0.35.4 | Deduplicated PWA asset tooling, including the generator override |

The review machine used Node 25.2.1 and npm 11.6.2. GitHub Actions currently uses the floating `lts/*` Node channel; release evidence should record the exact CI runtime because the workflow does not yet pin a Node major.

## Advisory status

Remediation updated fast-uri to 3.1.7 and constrained the PWA asset generator to sharp ^0.35.3, resolved as 0.35.4. The full and production dependency audits report zero advisories at this check.

The original advisories affected URI parsing and asset-generation dependencies; no application exploit was established. The reviewed fix updates those paths without downgrading the PWA plugin or introducing a server.

## Update policy

- Keep the lockfile committed and use `npm ci` in CI.
- Review direct and transitive changes together; rerun lint, typecheck, unit tests, build, browser tests, and audit.
- Verify current provider/API contracts separately from npm dependency updates.
- Never hard-code time-sensitive model pricing in source; store user-verified pricing records and freeze the applied basis per benchmark after TASK-064.
- Record advisory and runtime evidence by date and revision; an old clean audit is not a permanent guarantee.
