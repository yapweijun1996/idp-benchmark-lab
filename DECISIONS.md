# DECISIONS — ADR Summary

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
