# Modular Extraction Prompt Contract

## Purpose

Support user-adjustable extraction fields without rewriting application code.

Composition:

```text
Stable Base Rules
+
Extraction Contract
+
Output JSON Schema
```

## Current example contract

```json
{
  "doc_info": ["document_number", "date_transaction"],
  "row_data": ["stock_code", "stock_desc", "remark", "qty", "unit_price", "row_discount", "row_subtotal"],
  "footer": ["subtotal", "discount", "gst", "grand_total"]
}
```

## Mandatory semantics

### Field isolation

Before mapping to requested fields, determine which source field/column each visible value belongs to. If a value belongs to an unrequested source column, ignore it; never move it into another requested field.

### Remark

Populate only from a genuine row remark/note/comment. Do not use Vendor Article No., EAN, barcode, serial, reference number, store code, or continuation of another defined column.

### Stock description

Preserve the complete printed article/item description requested by the profile, including visible prefixes that are part of the description. Do not append separate unrequested source-column values.

### Missing values

Missing printed value = `null`. Missing does not mean zero.

### Footer

For extraction-only profiles, use printed values only. Do not calculate subtotal/GST/total unless calculation is explicitly part of the profile.

## Versioning

Every profile stores version, prompt hash, and schema hash. Prompt/schema changes create a new benchmark identity.
