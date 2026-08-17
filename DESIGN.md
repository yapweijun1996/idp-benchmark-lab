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

- **Home** (`#/home`) — most-recent-benchmark summary for returning users; a ready-to-run **Try
  Demo** card (bundled sample document/prompt/schema/expected-result, choose provider, choose
  1/3/5 runs, Run) for first-time users with zero benchmarks — see "Home — demo-first" below.
- **New Benchmark** (`#/new-benchmark`) — the guided wizard (see below); the primary workflow.
- **Runs & Results** (`#/runs`) — every past benchmark, newest first; inspect one for field
  accuracy, drift, and export.
- **Compare** (`#/compare`) — select 2+ benchmarks and compare side by side; warns (without
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

### Home — demo-first (Phase 8)

First-time users (zero benchmarks) see the **Try Demo** card (`src/pages/DemoBenchmarkCard.tsx`),
not an empty state or a setup checklist. A bundled sample — a synthetic "Popular Purchase Order"
document plus its matching extraction prompt, JSON schema, and expected result
(`demo/popular-po/`) — is already loaded; the card shows a "Demo ready: ✓ Sample PDF ✓ Extraction
prompt ✓ JSON schema ✓ Expected result" checklist with nothing to upload or configure first. The
user only chooses **AI provider/model**, pastes an **API key** (memory-only, exactly like every
other provider entry in this app — see BYOK below), picks **1 / 3 / 5 runs**, and clicks **Run
Benchmark**. The mode (native PDF vs. rendered images) is derived automatically from the chosen
provider's capabilities — the user is never asked to understand input modes to run the demo.
Results render inline: schema-valid/exact-match counts, field/row accuracy, stability, unique
variants, average latency, and a "Failures" list (run number, field path, expected vs. actual) for
quick mismatch inspection, plus a link into Runs & Results for full raw-output inspection. A
secondary, clearly subordinate "Want to test your own document? → Upload my document" link is the
only path into the full guided wizard — custom-document benchmarking is available but never
required to see value. The demo card seeds its fixture into local storage once (idempotent, fixed
ids) and runs through the *same* `BenchmarkRunner` as every other benchmark (`docs/` "Custom paths
reuse the core" — see below); it is not a separate engine.

Returning users (1+ benchmarks already run) see the pre-Phase-8 view: benchmark totals, the latest
benchmark's summary table (exact pass, schema-valid, leaf accuracy, consistency, latency, cost),
and a "Recent benchmarks" list. A "Compare results" link appears once 2+ benchmarks exist. This
view is deliberately unchanged — once someone has real benchmark history, showing it beats
repeating the demo pitch.

### New Benchmark (guided wizard)

A 6-step stepper (`src/pages/NewBenchmarkWizard.tsx`) replaces the old flat "Benchmark Builder"
form: **Document → What to Extract → Expected Result → Choose AI → Run Settings → Review & Run**.
Each step is unlocked only once its prerequisites are met (`maxReachable` gating); Expected
Result is optional and skippable. Advanced settings (temperature, reasoning effort) live behind a
collapsed `<details>` disclosure. Run Settings offers **Quick Test** (single run, immediate
feedback) or **Benchmark** (repeated runs via the embedded `RepeatedBenchmarkSection`, run count
preset from Settings → General, defaulting to 5). Review & Run shows the full config,
capability-gate warnings for incompatible provider/mode combinations, and estimated cost.

### Library

Tabs, each still their own focused screen for managing an asset outside the wizard:

- **Documents** — upload PDF, preview pages, choose local-session vs. "Save on this device"
  (IndexedDB) persistence, delete, fingerprint/size display.
- **Extraction Templates** — name, prompt version, base prompt, extraction contract, JSON
  schema, optional normalization policy; every save creates a new version.
- **Expected Results** — two-pane layout: PDF preview and editable Expected Result JSON,
  validated against the selected template's schema and versioned on every save.

### Settings

Tabs: **AI Providers** (OpenAI/Gemini/Custom OpenAI-compatible cards — model, base URL where
applicable, key input with "keep until this tab closes" opt-in, capabilities, connection test),
**General** (default input mode, default run count), **Storage** (per-table record counts,
two-step confirm to clear local data), **Backup & Restore** (export/import JSON, secret-field
rejection on import), **Privacy & Security** (static BYOK/key-handling explanation), **About**
(app build).

### Runs & Results / Run Inspector

Runs & Results lists every past benchmark; "Inspect" opens `SuiteDetail` — field accuracy
heatmap, ordered run list, and a run inspector (raw provider response, parsed JSON, Expected
Result, strict/normalized diff, schema errors, usage, cost, latency, output hash) plus JSON/CSV
export.

### Compare

Select 2+ benchmarks to compare side by side (exact pass, schema-valid, leaf/row accuracy,
consistency, unique variants, cost, latency). Warns when selected benchmarks' test configuration
(document/prompt/schema hashes) differ, without blocking the comparison.

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
