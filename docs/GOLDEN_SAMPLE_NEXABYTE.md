# Golden Sample - Nexabyte Purchase Order

The bundled synthetic `demo/nexabyte-po/` fixture is a complete one-page purchase order used as a second
multi-section Golden Test. It is distinct from both the five-row synthetic `demo/popular-po/` sample and the user-provided 13-row Popular PO regression fixture. It includes document metadata, supplier and delivery blocks, ten line
items, printed totals, purchase terms, a remark, and electronic approval details.

The fixture intentionally keeps identifiers, dates, quantities, prices, percentages, totals, and
approval timestamps as printed strings. The Expected Result is stored in `demo/nexabyte-po/golden.json`
and fixture tests validate it against `demo/nexabyte-po/schema.json`. The seeding function itself trusts the bundled data and writes `schemaValid: true`; it does not execute AJV at runtime before insertion.

The preset document, prompt, schema, and Expected Result can be used with any compatible configured provider for
cross-provider comparison. The fixture and its seeded IndexedDB records contain no provider credentials. Dedicated
API-key entry uses the runtime key store, but the current Custom-provider header persistence gap still applies; see
[BYOK_SECURITY.md](BYOK_SECURITY.md).
