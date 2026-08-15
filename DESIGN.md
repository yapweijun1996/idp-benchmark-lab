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

## Navigation

Desktop sidebar:

- Dashboard
- Documents
- Extraction Profiles
- Golden Answers
- Providers
- Benchmarks
- Compare
- Settings

Mobile/tablet may use a collapsible drawer or bottom navigation.

## Key screens

### Dashboard

Show last benchmark, active document/profile, model/provider, exact pass rate, field accuracy, consistency, schema validity, spend, latency, failed fields, and recent suites.

### Documents

- upload PDF
- preview pages
- choose active document
- choose input mode: Native PDF or Canonical Rendered Images
- delete local document
- show fingerprint and size

### Extraction Profiles

Profile contains name, prompt version, base prompt, extraction contract, JSON schema, optional normalization policy, hashes, timestamps.

### Golden Answer

Two-pane layout: PDF preview and editable Golden JSON. Validate against schema and version each save.

### Providers

Cards for OpenAI, Gemini, Custom OpenAI-Compatible. Show model, base URL where applicable, key input, capabilities, pricing, and connection test.

### Benchmark Builder

Select document, profile, Golden Answer, provider, model, thinking/reasoning level, temperature, input mode, run count (1/5/10/20/50/100), concurrency, budget cap.

Before start, show immutable benchmark identity and estimated cost if available.

### Benchmark Progress

Show completed/total, pass/fail, exact pass rate, schema-valid rate, spend/budget, elapsed time, ETA, and Stop.

### Benchmark Result

Tabs/sections: Summary, Field Accuracy, Row Accuracy, Stability, Variants, Cost, Latency, Errors, Run Inspector.

### Run Inspector

Show run number, raw provider response, parsed JSON, Golden Answer, strict diff, normalized diff, schema errors, usage, cost, latency, and output hash.

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
