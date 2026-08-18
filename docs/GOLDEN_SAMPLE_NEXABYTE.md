# Golden Sample - Nexabyte Purchase Order

The bundled `demo/nexabyte-po/` fixture is a complete one-page purchase order used as a second
multi-section Golden Test. It includes document metadata, supplier and delivery blocks, ten line
items, printed totals, purchase terms, a remark, and electronic approval details.

The fixture intentionally keeps identifiers, dates, quantities, prices, percentages, totals, and
approval timestamps as printed strings. The Expected Result is stored in `demo/nexabyte-po/golden.json`
and is validated against `demo/nexabyte-po/schema.json` before the fixture is seeded into IndexedDB.

The credential-free Demo GPT Gateway recognizes both bundled purchase-order PDFs and returns their
local Expected Result without a network request. A real provider can also use the preset document,
prompt, schema, and Golden Answer for cross-provider comparison.
