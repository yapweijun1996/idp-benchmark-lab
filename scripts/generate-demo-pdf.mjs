#!/usr/bin/env node
// One-off, dependency-free generator for the bundled demo PDF
// (demo/popular-po/input.pdf). Run with `node scripts/generate-demo-pdf.mjs`
// whenever the demo document's printed text needs to change — golden.json
// must always be kept in sync with exactly what this script prints.
//
// This is NOT the real "Popular PO" source document (that PDF was
// user-provided and is intentionally never committed, see
// src/test/fixtures/golden-popular-po.ts). This is a synthetic purchase
// order, written purely for this repo, that deliberately exercises the same
// regression-worthy shapes: a leading-zero document number, an exact
// compound product name, a decoy column that must not leak into requested
// fields, and an unprinted footer (so footer values must stay null rather
// than being calculated).

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "demo", "popular-po", "input.pdf");

const lines = [
  { size: 16, gap: 30, text: "PURCHASE ORDER" },
  { size: 10, gap: 20, text: "PO Number: 0083217" },
  { size: 10, gap: 16, text: "Date: 15.03.2024" },
  { size: 10, gap: 28, text: "Stock Code       Description                          Qty   Vendor Article No." },
  { size: 10, gap: 16, text: "910-006021       LOGITECH M650 M WL WHITE             2     VA-88213" },
  { size: 10, gap: 16, text: "910-006022       LOGITECH M650 M WL BLACK             1     VA-88214" },
  { size: 10, gap: 16, text: "920-010567       LOGITECH K120 KEYBOARD BLACK         3     VA-77102" },
  { size: 10, gap: 16, text: "920-009879       LOGITECH C270 HD WEBCAM BLACK        1     VA-65590" },
  { size: 10, gap: 16, text: "910-004914       LOGITECH M185 WIRELESS MOUSE GREY   4     VA-52233" },
  { size: 10, gap: 30, text: "This purchase order lists items ordered. No totals are printed below." },
];

function escapePdfString(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildContentStream() {
  const ops = ["BT", "50 780 Td"];
  let currentSize = 0;
  for (const line of lines) {
    if (line.size !== currentSize) {
      ops.push(`/F1 ${line.size} Tf`);
      currentSize = line.size;
    }
    ops.push(`0 -${line.gap} Td`);
    ops.push(`(${escapePdfString(line.text)}) Tj`);
  }
  ops.push("ET");
  return ops.join("\n");
}

function buildPdf() {
  const content = buildContentStream();
  const contentBytes = Buffer.byteLength(content, "latin1");

  const objects = [
    null, // objects are 1-indexed; index 0 unused
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${contentBytes} >>\nstream\n${content}\nendstream`,
  ];

  const chunks = [];
  let offset = 0;
  const push = (str) => {
    const buf = Buffer.from(str, "latin1");
    chunks.push(buf);
    offset += buf.length;
  };

  push("%PDF-1.4\n");
  const objOffsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    objOffsets.push(offset);
    push(`${i} 0 obj\n${objects[i]}\nendobj\n`);
  }

  const xrefStart = offset;
  const objectCount = objects.length; // includes the unused index 0
  push(`xref\n0 ${objectCount}\n`);
  push("0000000000 65535 f \n");
  for (let i = 1; i < objects.length; i += 1) {
    push(`${String(objOffsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objectCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

  return Buffer.concat(chunks);
}

const pdf = buildPdf();
writeFileSync(outPath, pdf);
console.log(`Wrote ${pdf.length} bytes to ${outPath}`);
