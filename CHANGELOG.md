# CHANGELOG

## 2026-08-15 — Documentation Seed

Created the docs-first implementation handoff for `idp-benchmark-lab`.

Established static GitHub Pages PWA, BYOK, OpenAI/Gemini/Custom provider scope, PDF upload/preview, modular prompt/schema profile, Golden Answer, repeated 5/10/20/50/100 benchmark, cost/usage tracking, accuracy-vs-stability metrics, variant/field drift analysis, budget/stop controls, direct JSON output, and source-field isolation.

Implementation status: not started.

## 2026-08-15 — PWA Foundation Scaffold

- Vite 8 + React 19 + strict TypeScript project scaffold (`tsc -b`, ESLint 9 flat config, Vitest + Testing Library).
- Responsive app shell: desktop sidebar + mobile drawer, hash-based routing for GitHub Pages.
- Base `./` asset URLs verified against the production build.
- Reconcile P1/P2 documentation review findings (adapter contract, canonical JSON Schema draft-07 example, benchmark identity normalization policy, metric denominator definitions, ADR-015).
- 6 unit tests passing; lint, typecheck, build green.
