/**
 * Golden Popular PO regression fixture (TESTING.md / docs/GOLDEN_SAMPLE.md).
 *
 * The source PDF is intentionally NOT committed; keep the Golden JSON here
 * plus local instructions for reproducing with the real document. This
 * fixture is the executable contract for the Golden PO regression tests.
 */
export const GOLDEN_POPULAR_PO = {
  doc_info: {
    document_number: "0004131999",
    date_transaction: "26.06.2023",
  },
  row_data: [
    { stock_code: "910-005506", stock_desc: "LOGITECH M221 SILENT WIRELESS MOUSE BLACK", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-005509", stock_desc: "LOGITECH M221 SILENT WIRELESS MOUSE BLUE", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-005510", stock_desc: "LOGITECH M221 SILENT WIRELESS MOUSE RED", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "920-010567", stock_desc: "LOGITECH K120 KEYBOARD BLACK", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "920-010568", stock_desc: "LOGITECH K120 KEYBOARD WHITE", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-006021", stock_desc: "LOGITECH M650 M WL WHITE", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-006022", stock_desc: "LOGITECH M650 M WL BLACK", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-006023", stock_desc: "LOGITECH M650 M WL ROSE", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "920-009879", stock_desc: "LOGITECH C270 HD WEBCAM BLACK", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "920-009880", stock_desc: "LOGITECH C310 HD WEBCAM BLACK", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-004914", stock_desc: "LOGITECH M185 WIRELESS MOUSE GREY", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-004915", stock_desc: "LOGITECH M185 WIRELESS MOUSE BLUE", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
    { stock_code: "910-004916", stock_desc: "LOGITECH M185 WIRELESS MOUSE RED", remark: null, qty: "1", unit_price: "0.00", row_discount: "0.00", row_subtotal: "0.00" },
  ],
  footer: {
    subtotal: null,
    discount: null,
    gst: null,
    grand_total: null,
  },
} as const;

/** Instructions for reproducing with the real source PDF (not committed). */
export const GOLDEN_POPULAR_PO_SOURCE_NOTE =
  "Source PDF: 'Popular' purchase order (user-provided). Load it on the Documents page, create the reduced extraction contract (doc_info/row_data/footer), and use this JSON as the Golden Answer.";
