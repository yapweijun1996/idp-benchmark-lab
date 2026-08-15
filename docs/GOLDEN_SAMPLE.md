# Golden Sample — Popular Purchase Order

## Purpose

Records the currently verified benchmark behavior that motivated IDP Benchmark Lab. It is not a replacement for the source PDF.

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
