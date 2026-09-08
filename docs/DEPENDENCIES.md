# Dependencies and Toolchain

## Source of truth

`package.json` declares supported ranges and `package-lock.json` (lockfile version 3) pins the installed dependency graph. This document is a dated summary for review, not a replacement for either file.

Reviewed 2026-09-08 at `26b0ae9`.

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
| `sharp` | 0.35.3 | PWA asset tooling at the top level |

The review machine used Node 25.2.1 and npm 11.6.2. GitHub Actions currently uses the floating `lts/*` Node channel. Release verification should record the exact CI runtime; TASK-066 should decide whether to pin it for reproducibility.

## Advisory status

The 2026-09-08 audit reported four high-severity affected entries when development dependencies and parent chains were included. The production-only graph still reported `fast-uri@3.1.5` through AJV. The asset-generation toolchain also contains a nested `sharp@0.33.5`; the top-level `sharp@0.35.3` does not replace that nested copy.

No exploitable application path was established by the audit. This static browser architecture must not be described as server-side exposure without reachability evidence. TASK-067 owns reviewed upgrades or an explicit reachability disposition. Do not apply an audit-suggested major downgrade of `vite-plugin-pwa` without checking compatibility, build output, and PWA behavior.

## Update policy

- Keep the lockfile committed and use `npm ci` in CI.
- Review direct and transitive changes together; rerun lint, typecheck, unit tests, build, browser tests, and audit.
- Verify current provider/API contracts separately from npm dependency updates.
- Never hard-code time-sensitive model pricing in source; store user-verified pricing records and freeze the applied basis per benchmark after TASK-064.
- Record advisory and runtime evidence by date and revision; an old clean audit is not a permanent guarantee.
