# DESIGN — IDP Benchmark Lab

## Product intent

IDP Benchmark Lab is an engineering/testing workbench, not an ERP operational workflow.

The UI should answer immediately:

- Which document is being tested?
- Which prompt/schema profile is active?
- Which provider/model/settings are active?
- What is the Golden Answer?
- How many runs are being executed?
- How accurate is the model?
- How stable is it?
- What did the benchmark cost?
- Which fields are failing?
- Which output variants are appearing?

## Design principles

These are design requirements. Known implementation gaps and release status are recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md); a principle listed here is not proof of enforcement.

1. **Do not hide test configuration.** Every result shows exact model, prompt version, schema version, thinking/reasoning level, temperature, input mode, renderer config, and app build.
2. **Accuracy and stability are separate.** A model can be consistently wrong.
3. **Golden Answer is explicit.** Never auto-rewrite the expected answer without user confirmation.
4. **No silent normalization.** Strict and normalized scores are separate.
5. **No hidden cost.** Show estimated cost and require budget cap before large runs when possible.
6. **Every failure is inspectable.** Open any run and see field-level diff.
7. **Static-first/local-first.** App is GitHub Pages; benchmark data is local unless exported.

## Navigation (task-oriented, post-redesign)

The app shell (`src/App.tsx`, `src/app/routes.ts`) uses a 6-item task-oriented nav, not an
entity-first sidebar. Each entity (document, extraction template, expected result, provider) is
a resource picked *inside* the guided benchmark workflow, not a top-level destination — it only
gets its own nav slot if a user needs to manage it independently of running a benchmark:

- **Home** (`#/home`) — latest-benchmark summary for returning users; sample-readiness information and a **Start benchmark** link into the wizard for first-time users.
- **New Benchmark** (`#/new-benchmark`) — the guided wizard (see below); the primary workflow.
- **Runs & Results** (`#/runs`) — the most recent 20 benchmarks, newest first; inspect one for
  field accuracy, drift, and export. Pagination/full-history access is not implemented (TASK-070).
- **Compare** (`#/compare`) — select 2+ of the most recent 20 benchmarks and compare side by side; warns (without
  blocking) when test configurations differ.
- **Library** (`#/library`) — tabs for Documents / Extraction Templates / Expected Results:
  reusable assets managed independently of a specific benchmark run.
- **Settings** (`#/settings`) — tabs for AI Providers / General / Storage / Backup & Restore /
  Privacy & Security / About.

Old bookmarks/deep links to the pre-redesign routes (`#/dashboard`, `#/documents`, `#/profiles`,
`#/golden`, `#/providers`, `#/benchmarks`) redirect to their nearest new-IA equivalent via
`LEGACY_REDIRECTS` in `routes.ts`, so they land on a still-working page rather than 404ing into a
blank shell.

Mobile/tablet collapses this into a slide-out drawer (see `styles/app.css` mobile breakpoint).

## Key screens

### Home — guided start

The active `DashboardPage` shows sample-readiness cards, workflow guidance, and a link to **New Benchmark** for first-time users. The wizard's Document step offers bundled samples or an upload. Home does not expose provider/API-key inputs or execute a benchmark inline. `DemoBenchmarkCard.tsx` is retained source from the earlier Phase 8 experience, not the current Home entry point; browser tests targeting it are stale (TASK-066).

The current Home status card recommends "3 repeated runs", while the repeated runner and saved default only support 5/10/20/50/100 (default 5). This is UI drift, not a supported three-run benchmark preset; TASK-070 must align the copy and behavior.

Returning users see benchmark totals, the latest benchmark's summary, recent history and a Compare link when two or more suites exist. The primary action still opens the wizard.

### New Benchmark (guided wizard)

A 6-step stepper (`src/pages/NewBenchmarkWizard.tsx`) replaces the old flat "Benchmark Builder"
form: **Document → What to Extract → Expected Result → Choose AI → Run Settings → Review & Run**.
Each step is unlocked only once its prerequisites are met (`maxReachable` gating); Expected
Result is optional and skippable. The What to Extract step can select a saved template and apply prompt/visual-schema/advanced-JSON overrides to the current run; it does not create an immutable saved template version. Advanced settings (temperature and a normalized reasoning/thinking override) live behind a
collapsed `<details>` disclosure. Run Settings offers **Quick Test** (single run, immediate
feedback) or **Benchmark** (repeated runs via the embedded `RepeatedBenchmarkSection`, run count
preset from Settings → General, defaulting to 5). Review & Run shows the full config,
capability-gate warnings for incompatible provider/mode combinations, and reports cost as unknown until the first run completes. The UI exposes a "Hard budget cap" field, but current enforcement is only a previous-run estimate and is not a guaranteed cap (TASK-059).

### Library

Tabs, each still their own focused screen for managing an asset outside the wizard:

- **Documents** — upload PDF, preview pages, choose local-session vs. "Save on this device"
  (IndexedDB) persistence, delete, fingerprint/size display.
- **Extraction Templates** — name, prompt version, base prompt, extraction contract, JSON
  schema, optional normalization policy; saves increment the version but currently overwrite the same record (TASK-061).
- **Expected Results** — two-pane layout: PDF preview and editable Expected Result JSON,
  validated against the selected template's schema; version numbers increment on save, but historical versions are not retained (TASK-061).

### Settings

Tabs: **AI Providers** (OpenAI/Gemini/Custom OpenAI-compatible cards — model, base URL where
applicable, API style for Custom, OpenAI reasoning effort, Gemini thinking level, key input with "keep until this tab closes" opt-in, capabilities, connection test),
**General** (default input mode, default run count), **Storage** (per-table record counts,
two-step confirm to clear local data), **Backup & Restore** (export/import JSON; current validation and secret handling have open gaps in TASK-058/062), **Privacy & Security** (static BYOK/key-handling explanation whose absolute safety copy currently overstates the implementation), **About**
(app build).

### Runs & Results / Run Inspector

Runs & Results lists the latest 20 suites returned by `useRunHistory`; older IndexedDB records are not reachable from this view even though the active subtitle says every benchmark is shown. Pagination/full-history support and truthful copy are required by TASK-070. "Inspect" opens `SuiteDetail` — field accuracy
heatmap, ordered run list, strict field mismatches, available raw/parsed output, current referenced Expected Result, and summary/export data. Normalized metrics are not persisted/displayed yet (TASK-065); old Expected Results must be frozen before historical inspectors can be trusted (TASK-061). Failed-response evidence remains incomplete (TASK-063).

### Compare

Select 2+ benchmarks to compare side by side (exact pass, schema-valid, leaf/row accuracy,
consistency, unique variants, cost, latency). Warns when selected benchmarks' test configuration
(document/prompt/schema hashes) differ, without blocking the comparison.

## Localization

The top bar offers English, Mandarin, Malay, Japanese, and Vietnamese, and persists the selection in app settings. Translation is incremental: missing entries fall back to English or the untranslated source key. Treat this as partial localization until page coverage, formatting, accessibility, and browser QA are completed under TASK-070.

## Visual style

- modern engineering/admin lab
- dense but readable
- desktop-first workspace, responsive on tablet/mobile
- one consistent content grid
- tables for runs; cards for summary only
- monospace for JSON/IDs/hashes
- accessible contrast and visible focus
- clear status chips: PASS, FAIL, PARTIAL, STOPPED, BUDGET STOP, PROVIDER ERROR

## Error UX

Errors must state what failed, where, whether retry is safe, whether usage/cost is known, and whether benchmark continues. Avoid generic "Something went wrong" messages.
