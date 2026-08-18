# Golden Sample - Nexabyte Purchase Order

The bundled `demo/nexabyte-po/` fixture is a complete one-page purchase order used as a second
multi-section Golden Test. It includes document metadata, supplier and delivery blocks, ten line
items, printed totals, purchase terms, a remark, and electronic approval details.

The fixture intentionally keeps identifiers, dates, quantities, prices, percentages, totals, and
approval timestamps as printed strings. The Expected Result is stored in `demo/nexabyte-po/golden.json`
and is validated against `demo/nexabyte-po/schema.json` before the fixture is seeded into IndexedDB.

The preset document, prompt, schema, and Golden Answer can be used with any configured provider for
cross-provider comparison. Provider credentials remain runtime-only and are never included in the
fixture or its seeded IndexedDB records.
