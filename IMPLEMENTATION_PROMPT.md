# Implementation Prompt for Coding Agent

Act as the lead engineer for a new GitHub project named **IDP Benchmark Lab** (`idp-benchmark-lab`).

## First action

Read all root documentation, especially README.md, DESIGN.md, SPEC.md, EPIC.md, ROADMAP.md, TASK.md, ARCHITECTURE.md, SECURITY.md, TESTING.md, DECISIONS.md, AGENTS.md.

Treat current repository code/tests as source of truth once implementation exists. Do not claim features without verification.

## Objective

Build a static PWA demo/spike that allows a user to:

1. Upload/preview PDF locally.
2. Create modular extraction profile: prompt + contract + JSON schema.
3. Define correct Golden Answer JSON.
4. Configure BYOK OpenAI, Gemini, Custom OpenAI-compatible.
5. Run one extraction.
6. Run 5/10/20/50/100 repeated tests.
7. Compare every run to Golden Answer.
8. Measure exact pass, schema validity, field accuracy, row accuracy, consistency, variants, field drift, latency, usage, cost.
9. Stop manually and enforce budget cap.
10. Inspect raw output/diffs and export evidence.
11. Auto-deploy to GitHub Pages via GitHub Actions.

## Critical constraints

- no required backend
- no application-owned keys
- BYOK keys memory-only by default
- no keys in IndexedDB/localStorage/Cache Storage/export
- provider calls direct from browser
- clear CORS diagnostics
- provider-specific code behind adapters
- IndexedDB local persistence
- service worker app-shell only

## Benchmark integrity

Do not treat runs as same configuration if provider, model, prompt, schema, Golden version, thinking/reasoning, temperature, input mode, renderer settings, or app build changed.

## Evaluation

Accuracy and consistency are separate. Use deterministic canonical JSON hashing. Preserve row order. Do not let normalization hide leading-zero loss, identifier digit errors, model-number errors, `null` vs zero, or field leakage.

## IDP field-isolation lesson

Repeated Golden PO tests showed Vendor Article No. values moving into `remark` or `stock_desc`. Benchmark must detect this. In modular extraction, unrequested source-column values must be ignored rather than repurposed.

## Sequence

Follow ROADMAP.md. Start with static shell + IndexedDB + Pages deployment, then Golden single-run, then repeated runner, then analytics.

## Completion rule

Do not stop at UI mock. MVP requires a real repeated benchmark with persisted runs, metrics, cost, and field-level diffs.

At each session end: update TASK.md, PROJECT_STATUS.md, docs for changed decisions, and report tests/build/blockers.
