# Golden Sample — Popular Purchase Order

## Purpose

Records the currently verified benchmark behavior that motivated IDP Benchmark Lab. It is not a replacement for the source PDF.

## Fixture boundaries

Do not combine three different samples under the label "Popular PO":

| Evidence set | Rows | Source | Current use |
| --- | ---: | --- | --- |
| Golden Popular PO regression | 13 | User-provided purchase order; source PDF is not committed | `src/test/fixtures/golden-popular-po.ts` and `examples/golden-popular-po.golden.json` protect the field-isolation lessons below |
| Bundled Popular PO demo | 5 | Synthetic PDF and JSON in `demo/popular-po/` | Auto-seeded document/template/Expected Result offered by the New Benchmark wizard |
| Bundled Nexabyte PO demo | 10 | Synthetic PDF and JSON in `demo/nexabyte-po/` | Second auto-seeded multi-section wizard sample; documented separately in `GOLDEN_SAMPLE_NEXABYTE.md` |

The bundled samples are not copies of the user-provided 13-row source and must not be used to claim its visual ground truth. `seedDemoFixture` inserts their stored records but does not run AJV validation itself; fixture/schema agreement is enforced by tests.

## Verified high-level fields

- document number: `0004131999`
- transaction date: `26.06.2023`
- visible item rows: 13

## Verified text notes

User manually verified:
- printed brand text includes `LOGITECH`
- printed product text includes `M650 M WL WHITE` where applicable

## Source-column semantics

The source table includes `Article No./EAN/Vendor Article No.`.

Observed continuation values include:
- `920-007596`
- `910-004914`

These are not generic remarks. If `vendor_article_no` is not requested, correct modular extraction must not move them into `remark`, `stock_desc`, or another requested field.

## Stability observations

Different runs/configurations produced:
1. correct `remark: null`
2. Vendor Article No. placed in `remark`
3. Vendor Article No. appended to `stock_desc`
4. `M650 M WL WHITE` transcribed as `M650 MWL WHITE`

These are benchmark mismatches against the appropriate Golden Answer.

## Footer for reduced contract

- subtotal: null
- discount: null
- gst: null
- grand_total: null

because these requested monetary footer values are not printed on the tested page.

## Benchmark lesson

Hold constant model, prompt, schema, Golden version, thinking/reasoning, input mode, renderer, temperature/settings, and app build before calling results repeatability evidence.
