# AGENTS.md — Coding Agent Operating Rules

## Mission

Build `idp-benchmark-lab` as a static GitHub Pages PWA for repeatable IDP extraction benchmarking.

## Read first

Before changing code, read README.md, SPEC.md, ARCHITECTURE.md, DECISIONS.md, TASK.md.

After code exists, code/tests/schemas are executable source of truth. Update stale docs in the same task.

## Non-negotiable constraints

- static GitHub Pages deployment
- no required backend
- BYOK; never commit/persist keys by default
- OpenAI/Gemini/Custom OpenAI-compatible
- local PDF upload
- prompt/schema/Golden Answer editor
- 5/10/20/50/100 runs
- Stop + hard budget cap
- raw local run evidence
- accuracy and stability separate
- benchmark identity includes model + prompt + schema + settings + input
- direct structured JSON root
- unrequested source fields must not leak
- missing printed values = null
- no unrequested arithmetic inference

## Implementation style

- TypeScript strict
- small modules
- provider APIs isolated in adapters
- pure/deterministic evaluation engine
- no provider-specific logic in generic runner
- no silent normalization
- no secret-bearing logs
- explicit error states

## Task workflow

1. Inspect code.
2. Confirm relevant docs.
3. State intended change.
4. Implement smallest coherent slice.
5. Add/update tests.
6. Run lint/typecheck/tests/build.
7. Update TASK.md status.
8. Update docs if behavior/architecture changed.
9. Report blockers accurately.

## Avoid

Backend creep, Redis/Postgres in MVP, hidden proxy, hard-coded timeless pricing, model-name-only comparisons, auto-fixing Golden Answer, secret exports, and treating CORS failures as model failures.
