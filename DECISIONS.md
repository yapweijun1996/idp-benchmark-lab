# DECISIONS — ADR Summary

These decisions remain the intended architecture. The [2026-09-08 review](docs/reviews/2026-09-08-production-readiness.md) found implementation gaps in immutable identity (ADR-005), persisted normalized metrics (ADR-006), safe raw evidence (ADR-007), and credential non-persistence (ADR-012). No ADR is relaxed by the documentation update; fixes are tracked in [TASK.md](TASK.md).

## ADR-001 Static GitHub Pages PWA
MVP has no application backend. Trade-off: browser-visible BYOK keys and provider CORS limitations.

## ADR-002 BYOK only
No repository/server-owned provider credentials.

## ADR-003 Accuracy != Stability
Show separate accuracy and consistency metrics.

## ADR-004 Golden Answer is user-controlled
Expected JSON is explicitly edited/approved by user.

## ADR-005 Benchmark identity is immutable
Model name alone is insufficient; prompt/schema/settings/input/build are part of identity.

## ADR-006 Strict and normalized metrics are separate
Normalization cannot hide OCR/identifier errors.

## ADR-007 Preserve raw provider evidence
Keep safe raw response + parsed JSON locally; remove secrets.

## ADR-008 Provider abstraction
Runner depends on normalized adapters, not provider APIs.

## ADR-009 Custom provider MVP is OpenAI-compatible
Generic arbitrary REST templating is deferred.

## ADR-010 Two input modes
Native PDF and canonical-rendered-image tests are distinct.

## ADR-011 IndexedDB persistence
No server database in MVP.

## ADR-012 API keys memory-only by default
No IndexedDB/localStorage key persistence.

## ADR-013 Unrequested fields must not leak
Values from unrequested source columns must not be reassigned into requested fields. This is a benchmarkable contract.

## ADR-014 No automatic calculation of missing document values
Missing printed subtotal/GST/total remains `null` unless a profile explicitly requests calculation.

## ADR-015 Canonical schema stores document values as strings
Quantities, prices, and amounts are strings in the canonical schema to avoid `5` vs `5.00` drift and locale formatting differences. Comparison stays character-sensitive. Numeric output is allowed only when the profile schema explicitly declares number types.

## ADR-016 Guided wizard is the primary entry point
Home routes users into the six-step New Benchmark wizard. Bundled samples are normal document/template/Expected Result records and reuse the same execution engine; the retained inline `DemoBenchmarkCard` is not an active alternative workflow and should be removed or deliberately restored under TASK-070.

## ADR-017 No built-in provider gateway
The app does not create an offline/demo gateway or application-owned provider endpoint. Bundled samples do not include a provider config. Users configure OpenAI, Gemini, or a Custom OpenAI-compatible endpoint and provide credentials at runtime.

## ADR-018 Provider settings remain explicit and model IDs editable
Model lists are suggestions, not an authoritative registry. OpenAI reasoning effort and Gemini thinking level are stored as provider settings and normalized into the run's reasoning/thinking input; adapters translate them to provider-specific payload fields. Support must be verified for the chosen live model.

## ADR-019 Localization uses explicit fallback
The UI offers `en`, `zh`, `ms`, `ja`, and `vi`, persists the selection locally, and falls back to English or the source key when a translation is missing. This fallback keeps the app operable but is not proof of complete localization coverage (TASK-070).
